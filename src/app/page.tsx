
"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Copy, Rocket, Plus, Trash2, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";


const productSchema = z.object({
  productUrl: z.string().url({ message: "유효한 상품 URL을 입력해주세요." }),
  productLandingUrl: z
    .string()
    .optional()
    .or(z.literal("")),
  productPrice: z.string().min(1, { message: "상품 판매가를 입력해주세요." }),
  coinDiscountRate: z.string().optional(),
  discountCode: z.string().optional(),
  discountCodePrice: z.string().optional(),
  storeCouponCode: z.string().optional(),
  storeCouponPrice: z.string().optional(),
  cardCompanyName: z.string().optional(),
  cardPrice: z.string().optional(),
});

const formSchema = z.object({
  products: z.array(productSchema).min(1, "최소 1개의 상품을 추가해야 합니다."),
});

type FormData = z.infer<typeof formSchema>;

interface ProductInfo {
    product_main_image_url: string;
    product_title: string;
    original_url: string;
    sale_volume: string;
}

interface ReviewInfo {
    korean_summary: string;
    korean_local_count: number;
    total_num: number;
    source_url: string;
}


const parsePrice = (priceStr: string | undefined | null): { amount: number; currency: 'KRW' | 'USD' } => {
    if (!priceStr) return { amount: 0, currency: 'USD' };
    const cleanStr = String(priceStr).trim();
    if (cleanStr.includes('원')) {
        return { amount: parseFloat(cleanStr.replace(/[^0-9.]/g, '')) || 0, currency: 'KRW' };
    }
    const amount = parseFloat(cleanStr.replace(/[^0-9.]/g, '')) || 0;
    return { amount, currency: 'USD' };
};


const formatPrice = (price: { amount: number; currency: 'KRW' | 'USD' }): string => {
    if (price.currency === 'KRW') {
        return `${price.amount.toLocaleString('ko-KR')}원`;
    }
    return `$${price.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function Home() {
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      products: [
        {
          productUrl: "",
          productLandingUrl: "",
          productPrice: "",
          coinDiscountRate: "",
          discountCode: "",
          discountCodePrice: "",
          storeCouponCode: "",
          storeCouponPrice: "",
          cardCompanyName: "",
          cardPrice: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const handleCopy = () => {
    if (!generatedHtml) return;
    navigator.clipboard.writeText(generatedHtml).then(() => {
      toast({
        title: "성공!",
        description: "HTML이 클립보드에 복사되었습니다.",
      });
    });
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setGeneratedHtml("");

    try {
        const productUrls = data.products.map(p => p.productUrl);
        const imageBody = JSON.stringify({ target_urls: productUrls });
        console.log("호출하는 JSON (이미지/제목):", imageBody);
        const productInfoResponse = await fetch("/api/generate-image-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: imageBody,
        });
        
        const reviewBody = JSON.stringify({ target_urls: productUrls });
        console.log("호출하는 JSON (리뷰):", reviewBody);
        const reviewResponse = await fetch("/api/generate-reviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: reviewBody,
        });

        if (!productInfoResponse.ok) {
            const errorResult = await productInfoResponse.json();
            throw new Error(errorResult.error || `상품 정보 API 오류: ${productInfoResponse.status}`);
        }
         if (!reviewResponse.ok) {
            const errorResult = await reviewResponse.json();
            throw new Error(errorResult.error || `리뷰 정보 API 오류: ${reviewResponse.status}`);
        }

        const productInfoResult = await productInfoResponse.json();
        const reviewResult = await reviewResponse.json();

        const productInfos = productInfoResult.productInfos as (ProductInfo | null)[];
        const reviewInfos = reviewResult.reviewInfos as (ReviewInfo | null)[];

        if (!productInfos || !Array.isArray(productInfos)) {
            throw new Error("상품 정보를 가져오는 데 실패했습니다. API 응답이 올바르지 않습니다.");
        }
        if (!reviewInfos || !Array.isArray(reviewInfos)) {
            throw new Error("리뷰 정보를 가져오는 데 실패했습니다. API 응답이 올바르지 않습니다.");
        }
        
        let allHtml = "";
        let hasErrors = false;
        
        data.products.forEach((product, index) => {
            const productInfo = productInfos.find(info => info && info.original_url === product.productUrl);

            if (!productInfo || !productInfo.product_main_image_url || !productInfo.product_title) {
                console.error(`[FRONTEND] 상품 정보가 누락되었습니다. URL: ${product.productUrl}, 받은 정보:`, productInfo);
                 toast({
                    variant: "destructive",
                    title: "상품 정보 조회 실패",
                    description: `다음 URL의 상품 정보를 가져올 수 없습니다: ${product.productUrl}`,
                });
                hasErrors = true;
                return; 
            }

            if (index > 0) {
              allHtml += `<br><hr style="height: 1px; background-color: #999999; border: none;"><br>`;
            }
            
            const reviewInfo = reviewInfos.find(info => info && info.source_url === product.productUrl);
            
            let finalUrl = product.productUrl;

            if (product.productLandingUrl && product.productLandingUrl.trim() !== '') {
               if (product.productLandingUrl.startsWith('https://s.click.aliexpress.com')) {
                    finalUrl = product.productLandingUrl.replace('https://', 'http:');
                } else {
                    finalUrl = product.productLandingUrl;
                }
            } else {
                const params = 'disableNav=YES&sourceType=620&_immersiveMode=true&wx_navbar_transparent=true&channel=coin&wx_statusbar_hidden=true&isdl=y&aff_platform=true';
                if (finalUrl.includes('?')) {
                    finalUrl += '&' + params;
                } else {
                    finalUrl += '?' + params;
                }
            }
            
            const mainPrice = parsePrice(product.productPrice);
            
            const allDiscountPrices = [
                product.discountCodePrice,
                product.storeCouponPrice,
                product.cardPrice
            ].map(price => parsePrice(price));

            let finalPriceAmount = mainPrice.amount;

            allDiscountPrices.forEach(discountPrice => {
                finalPriceAmount -= discountPrice.amount;
            });

            // Calculate coin discount
            if (product.coinDiscountRate) {
                const rateStr = product.coinDiscountRate.replace('%', '').trim();
                const rate = parseFloat(rateStr);
                if (!isNaN(rate)) {
                    const coinDiscountAmount = mainPrice.amount * (rate / 100);
                    finalPriceAmount -= coinDiscountAmount;
                }
            }
            
            const finalPrice = { amount: finalPriceAmount > 0 ? finalPriceAmount : 0, currency: mainPrice.currency };

            let discountDetails = "";
            if (product.discountCodePrice && parsePrice(product.discountCodePrice).amount > 0) {
              discountDetails += `<p style="margin: 2px 0; font-size: 15px; color: #404040;"><strong>할인코드:</strong> -${formatPrice(parsePrice(product.discountCodePrice))}${product.discountCode ? ` ( ${product.discountCode} )` : ""}</p>`;
            }
            if (product.storeCouponPrice && parsePrice(product.storeCouponPrice).amount > 0) {
              discountDetails += `<p style="margin: 2px 0; font-size: 15px; color: #404040;"><strong>스토어쿠폰:</strong> -${formatPrice(parsePrice(product.storeCouponPrice))}${product.storeCouponCode ? ` ( ${product.storeCouponCode} )` : ""}</p>`;
            }
            if (product.coinDiscountRate) {
              discountDetails += `<p style="margin: 2px 0; font-size: 15px; color: #404040;"><strong>코인할인:</strong> ${product.coinDiscountRate ? ` ( ${product.coinDiscountRate} )` : ""}</p>`;
            }
            if (product.cardPrice && parsePrice(product.cardPrice).amount > 0) {
              discountDetails += `<p style="margin: 2px 0; font-size: 15px; color: #404040;"><strong>카드할인:</strong> -${formatPrice(parsePrice(product.cardPrice))}${product.cardCompanyName ? ` ( ${product.cardCompanyName} )` : ""}</p>`;
            }


            let reviewHtml = '';
            if (reviewInfo && reviewInfo.korean_summary) {
                const reviews = reviewInfo.korean_summary.split('|').map(r => r.trim()).filter(r => r);
                
                let reviewTitleParts = [];
                let saleVolumeText = "";
                if (productInfo.sale_volume && Number(productInfo.sale_volume) > 0) {
                    saleVolumeText = `총판매 ${Number(productInfo.sale_volume).toLocaleString('ko-KR')}개`;
                    reviewTitleParts.push(saleVolumeText);
                }
                if (reviewInfo.total_num) {
                    reviewTitleParts.push(`총리뷰 ${reviewInfo.total_num.toLocaleString('ko-KR')}개`);
                }
                if (reviewInfo.korean_local_count) {
                    reviewTitleParts.push(`국내리뷰 ${reviewInfo.korean_local_count.toLocaleString('ko-KR')}개`);
                }

                const reviewTitle = `리뷰 요약 ( ${reviewTitleParts.join(', ')} )`;

                const reviewContent = reviews.map((review) => {
                    if (review.length > 50) {
                        const shortText = review.substring(0, 50);
                        return `
                            <p style="margin: 0 0 10px 0; font-size: 14px;">
                                - ${shortText}... <a href="${finalUrl}" target="_blank" rel="noopener noreferrer" style="color: #2761c4; text-decoration: none;">더보기</a>
                            </p>`;
                    }
                    return `<p style="margin: 0 0 10px 0; font-size: 14px;">- ${review}</p>`;
                }).join('');


                reviewHtml = `
<p>&nbsp;</p>
<h3 style="margin-bottom: 10px; font-size: 16px; font-weight: 600; color: #1f2937;">${reviewTitle}</h3>
<div style="font-size: 14px; color: #4b5563; padding: 16px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
    ${reviewContent}
</div>`;
            } else if (reviewInfo) {
                 reviewHtml = `
<p>&nbsp;</p>
<h3 style="margin-bottom: 10px; font-size: 16px; font-weight: 600; color: #1f2937;">리뷰 요약</h3>
<div style="font-size: 14px; color: #4b5563; padding: 16px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
    <p style="margin: 0;">국내 리뷰가 없습니다.</p>
</div>`;
            }


            const htmlTemplate = `
<p style="text-align: center;">
    <a href="${finalUrl}" target="_blank" rel="noopener noreferrer">
        <img src="${productInfo.product_main_image_url}" alt="${productInfo.product_title}" style="max-width: 500px; width: 100%; height: auto; border-radius: 8px;">
    </a>
</p>
<p>&nbsp;</p>
<p>
    <a href="${finalUrl}" target="_blank" rel="noopener noreferrer" style="color: #0056b3; font-size: 20px; font-weight: 700; text-decoration: none;">
        ${productInfo.product_title}
    </a>
</p>
<p>&nbsp;</p>
<p style="margin: 2px 0; font-size: 15px; color: #404040;"><strong>할인판매가:</strong> <span style="text-decoration: line-through;">${formatPrice(mainPrice)}</span></p>
${discountDetails}
<p style="margin: 10px 0 0; font-size: 18px; font-weight: 700; color: #111827;"><strong>최대 할인가:</strong> ${formatPrice(finalPrice)}</p>
${reviewHtml}
<p>&nbsp;</p>`;
            allHtml += htmlTemplate;
        });

      if (!hasErrors) {
        toast({
            title: "성공!",
            description: "HTML 생성이 완료되었습니다.",
        });
      }

      setGeneratedHtml(allHtml.trim());
    } catch (error: any) {
      console.error("[FRONTEND] Error during HTML generation process:", error);
      toast({
        variant: "destructive",
        title: "오류 발생",
        description: error.message || "HTML 생성 중 오류가 발생했습니다. 입력값을 확인하거나 다시 시도해주세요.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const formFields = {
    required: [
        { name: "productUrl", label: "알리익스프레스 상품 URL", placeholder: "https://www.aliexpress.com/...", isRequired: true },
        { name: "productLandingUrl", label: "수익태그 (선택사항)", placeholder: "http:s.click.aliexpress.com/..." },
        { name: "productPrice", label: "상품판매가", placeholder: "예: 25 또는 30000원", type: "text", isRequired: true },
        { name: "coinDiscountRate", label: "코인할인율", placeholder: "예: 10%" },
    ],
    collapsible: [
        { name: "discountCode", label: "할인코드", placeholder: "예: KR1234" },
        { name: "discountCodePrice", label: "할인코드 할인가", placeholder: "예: 5 또는 5000원", type: "text" },
        { name: "storeCouponCode", label: "스토어쿠폰 코드", placeholder: "예: STORE1000" },
        { name: "storeCouponPrice", label: "스토어쿠폰 코드 할인가", placeholder: "예: 2 또는 2000원", type: "text" },
        { name: "cardCompanyName", label: "카드사명", placeholder: "예: 카카오페이" },
        { name: "cardPrice", label: "카드할인가", placeholder: "예: 3 또는 3000원", type: "text" },
    ]
  } as const;

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-primary flex items-center justify-center gap-3">
            <Rocket className="h-10 w-10" />
            Aliexpress 밴드 글쓰기
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            상품 정보를 입력하고 블로그 포스팅용 HTML을 바로 생성하세요.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>1. 정보 입력</CardTitle>
              <CardDescription>
                상품 정보와 할인 내역을 입력해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {fields.map((item, index) => (
                    <div key={item.id} className="space-y-4 rounded-lg border p-4 relative">
                        <CardTitle className="text-xl mb-4">상품 {index + 1}</CardTitle>
                        {fields.length > 1 && (
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-4 right-4 h-7 w-7"
                                onClick={() => remove(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                      {formFields.required.map((fieldInfo) => (
                        <FormField
                          key={`${item.id}-${fieldInfo.name}`}
                          control={form.control}
                          name={`products.${index}.${fieldInfo.name}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {fieldInfo.label}
                                {fieldInfo.isRequired && <span className="text-destructive"> *</span>}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={fieldInfo.placeholder}
                                  type={fieldInfo.type || "text"}
                                  {...field}
                                  value={field.value ?? ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                        <Collapsible>
                            <CollapsibleTrigger asChild>
                                <Button variant="outline" className="w-full">
                                    <ChevronDown className="h-4 w-4 mr-2" />
                                    할인 정보 펼치기/접기
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-4 pt-4">
                                {formFields.collapsible.map((fieldInfo) => (
                                    <FormField
                                    key={`${item.id}-${fieldInfo.name}`}
                                    control={form.control}
                                    name={`products.${index}.${fieldInfo.name}`}
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>
                                            {fieldInfo.label}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                            placeholder={fieldInfo.placeholder}
                                            type={fieldInfo.type || "text"}
                                            {...field}
                                            value={field.value ?? ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                ))}
                            </CollapsibleContent>
                        </Collapsible>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => append({ 
                        productUrl: "",
                        productLandingUrl: "",
                        productPrice: "",
                        coinDiscountRate: "",
                        discountCode: "",
                        discountCodePrice: "",
                        storeCouponCode: "",
                        storeCouponPrice: "",
                        cardCompanyName: "",
                        cardPrice: "",
                     })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    상품 추가하기
                  </Button>

                  <Separator />

                  <Button
                    type="submit"
                    className="w-full text-lg py-6"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    {isLoading ? "생성 중..." : "HTML 생성하기"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="shadow-lg mt-8 md:mt-0 flex flex-col">
            <CardHeader>
              <CardTitle>2. 결과 확인 및 복사</CardTitle>
              <CardDescription>
                생성된 HTML 코드입니다. 아래 버튼으로 복사하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
              <Textarea
                readOnly
                value={generatedHtml}
                placeholder="이곳에 생성된 HTML 코드가 표시됩니다."
                className="flex-grow text-sm min-h-[300px] resize-none font-code"
              />
              <Button
                onClick={handleCopy}
                className="mt-4 w-full text-lg py-6"
                disabled={!generatedHtml || isLoading}
              >
                <Copy className="mr-2 h-5 w-5" />
                HTML 복사하기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

    

    