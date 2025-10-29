
"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Copy, Rocket, Plus, Trash2 } from "lucide-react";

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

const productSchema = z.object({
  productUrl: z.string().url({ message: "유효한 상품 URL을 입력해주세요." }),
  productLandingUrl: z
    .string()
    .optional()
    .or(z.literal("")),
  productPrice: z.string().min(1, { message: "상품 판매가를 입력해주세요." }),
  discountCode: z.string().optional(),
  discountCodePrice: z.string().optional(),
  storeCouponCode: z.string().optional(),
  storeCouponPrice: z.string().optional(),
  coinDiscountRate: z.string().optional(),
  coinPrice: z.string().optional(),
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
}

const parsePrice = (priceStr: string | undefined | null): { amount: number; currency: 'KRW' | 'USD' } => {
    if (!priceStr) return { amount: 0, currency: 'USD' };
    const cleanStr = String(priceStr).trim();
    if (cleanStr.includes('원')) {
        return { amount: parseFloat(cleanStr.replace(/[^0-9.]/g, '')) || 0, currency: 'KRW' };
    }
    return { amount: parseFloat(cleanStr.replace(/[^0-9.]/g, '')) || 0, currency: 'USD' };
};

const formatPrice = (price: { amount: number; currency: 'KRW' | 'USD' }): string => {
    if (price.currency === 'KRW') {
        return `${price.amount.toLocaleString('ko-KR')}원`;
    }
    return `$${price.amount.toLocaleString('en-US')}`;
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
          discountCode: "",
          discountCodePrice: "",
          storeCouponCode: "",
          storeCouponPrice: "",
          coinDiscountRate: "",
          coinPrice: "",
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
    console.log("[FRONTEND] Form submitted with data:", data);

    try {
        const productUrls = data.products.map(p => p.productUrl);
        console.log("[FRONTEND] Sending URLs to API:", productUrls);

        const response = await fetch("/api/generate-image-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target_urls: productUrls }),
        });
        
        console.log('[FRONTEND] Raw response from API:', response);
        const result = await response.json();
        console.log('[FRONTEND] Parsed JSON from API:', result);


        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status} - 서버 오류가 발생했습니다.`);
        }

        const productInfos = result.productInfos as (ProductInfo | null)[];
        console.log('[FRONTEND] Received from API:', productInfos);

        if (!productInfos || !Array.isArray(productInfos)) {
            throw new Error("상품 정보를 가져오는 데 실패했습니다. API 응답이 올바르지 않습니다.");
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
                return; // Skip this product
            }

            let finalUrl = product.productLandingUrl || product.productUrl;

            if (product.productLandingUrl && product.productLandingUrl.trim() !== '') {
               finalUrl = product.productLandingUrl;
            } else {
                const params = 'disableNav=YES&sourceType=620&_immersiveMode=true&wx_navbar_transparent=true&channel=coin&wx_statusbar_hidden=true&isdl=y&aff_platform=true';
                if (finalUrl.includes('?')) {
                    finalUrl += '&' + params;
                } else {
                    finalUrl += '?' + params;
                }
            }
            
            const mainPrice = parsePrice(product.productPrice);
            const discountCodePrice = parsePrice(product.discountCodePrice);
            const storeCouponPrice = parsePrice(product.storeCouponPrice);
            const coinPrice = parsePrice(product.coinPrice);
            const cardPrice = parsePrice(product.cardPrice);

            let finalPriceAmount = mainPrice.amount;
            if (mainPrice.currency === discountCodePrice.currency) finalPriceAmount -= discountCodePrice.amount;
            if (mainPrice.currency === storeCouponPrice.currency) finalPriceAmount -= storeCouponPrice.amount;
            if (mainPrice.currency === coinPrice.currency) finalPriceAmount -= coinPrice.amount;
            if (mainPrice.currency === cardPrice.currency) finalPriceAmount -= cardPrice.amount;

            const finalPrice = { amount: finalPriceAmount > 0 ? finalPriceAmount : 0, currency: mainPrice.currency };

            let discountDetails = "";
            if (discountCodePrice.amount > 0) {
              discountDetails += `<p style="margin: 4px 0; font-size: 15px; color: #555;"><strong>할인코드 (${
                  product.discountCode || ""
              }):</strong> -${formatPrice(discountCodePrice)}</p>`;
            }
            if (storeCouponPrice.amount > 0) {
              discountDetails += `<p style="margin: 4px 0; font-size: 15px; color: #555;"><strong>스토어쿠폰 (${
                  product.storeCouponCode || ""
              }):</strong> -${formatPrice(storeCouponPrice)}</p>`;
            }
            if (coinPrice.amount > 0) {
              discountDetails += `<p style="margin: 4px 0; font-size: 15px; color: #555;"><strong>코인할인 (${product.coinDiscountRate || ''}):</strong> -${formatPrice(coinPrice)}</p>`;
            }
            if (cardPrice.amount > 0) {
              discountDetails += `<p style="margin: 4px 0; font-size: 15px; color: #555;"><strong>카드할인 (${product.cardCompanyName || ''}):</strong> -${formatPrice(cardPrice)}</p>`;
            }

            const htmlTemplate = `
<div style="font-family: 'Inter', sans-serif; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; max-width: 550px; margin: 20px auto; background: #fafafa;">
    <div style="max-width: 500px; margin: 0 auto;">
        <a href="${finalUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: block; text-align: center; margin-bottom: 12px;">
            <img src="${productInfo.product_main_image_url}" alt="Product Image" style="max-width: 500px; width: 100%; height: auto; border-radius: 8px; border: 1px solid #f0f0f0; display: block;">
        </a>
        <a href="${finalUrl}" target="_blank" rel="noopener noreferrer" style="color: #2761c4; outline: none; text-decoration-line: none !important;">
            <p style="text-align: left; font-size: 16px; font-weight: 500; margin: 0 0 20px 0;">🔥 ${productInfo.product_title}</p>
        </a>
        <div style="text-align: left;">
            <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; font-weight: 600; color: #1f2937;">상품 할인 정보 안내</h3>
            <div style="font-size: 15px; color: #4b5563; padding: 16px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
                <p style="margin: 4px 0;"><strong>정상가:</strong> <span style="text-decoration: line-through;">${formatPrice(mainPrice)}</span></p>
                ${discountDetails}
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 12px 0;">
                <p style="margin: 10px 0 0; font-size: 18px; font-weight: 700; color: #111827;"><strong>최종 구매 가격:</strong> ${formatPrice(finalPrice)}</p>
            </div>
            <a href="${finalUrl}" target="_blank" rel="noopener noreferrer" style="display: block; background-color: #374151; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px; text-align: center; margin-top: 20px; transition: background-color 0.2s ease;">
                상품 페이지로 이동하여 확인하기
            </a>
        </div>
    </div>
</div>`;
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
  
  const formFields = [
    { name: "productUrl", label: "알리익스프레스 상품 URL", placeholder: "https://www.aliexpress.com/...", isRequired: true },
    { name: "productLandingUrl", label: "상품 랜딩 URL (선택사항)", placeholder: "http:s.click.aliexpress.com/..." },
    { name: "productPrice", label: "상품판매가", placeholder: "예: 25 또는 30000원", type: "text", isRequired: true },
    { name: "discountCode", label: "할인코드", placeholder: "예: KR1234" },
    { name: "discountCodePrice", label: "할인코드 할인가", placeholder: "예: 5 또는 5000원", type: "text" },
    { name: "storeCouponCode", label: "스토어쿠폰 코드", placeholder: "예: STORE1000" },
    { name: "storeCouponPrice", label: "스토어쿠폰 코드 할인가", placeholder: "예: 2 또는 2000원", type: "text" },
    { name: "coinDiscountRate", label: "코인할인율", placeholder: "예: 10%" },
    { name: "coinPrice", label: "코인할인가", placeholder: "예: 1 또는 1000원", type: "text" },
    { name: "cardCompanyName", label: "카드사명", placeholder: "예: 카카오페이" },
    { name: "cardPrice", label: "카드할인가", placeholder: "예: 3 또는 3000원", type: "text" },
  ] as const;

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-primary flex items-center justify-center gap-3">
            <Rocket className="h-10 w-10" />
            AliExpress 포스팅 HTML 생성기
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
                      {formFields.map((fieldInfo) => (
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
                        discountCode: "",
                        discountCodePrice: "",
                        storeCouponCode: "",
                        storeCouponPrice: "",
                        coinDiscountRate: "",
                        coinPrice: "",
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
