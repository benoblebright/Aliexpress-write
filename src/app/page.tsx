"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Rocket, Plus, Trash2, ChevronDown } from "lucide-react";

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const productSchema = z.object({
  productUrl: z.string().url({ message: "유효한 상품 URL을 입력해주세요." }),
  affShortKey: z.string().min(1, { message: "제휴 단축 키를 입력해주세요." }),
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

interface AllInfo {
    product_main_image_url: string;
    product_title: string;
    korean_summary: string;
    korean_local_count: number;
    total_num: number;
    final_url: string;
    sale_volume: string;
    original_url: string;
}

type BandPostStatus = 'idle' | 'success' | 'error' | 'loading';
interface BandPostResult {
    status: BandPostStatus;
    message: string;
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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [bandPostResult, setBandPostResult] = useState<BandPostResult | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      products: [
        {
          productUrl: "",
          affShortKey: "",
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

  const handlePostToBand = async (data: FormData) => {
    setIsLoading(true);
    setBandPostResult({ status: 'loading', message: '상품 정보를 가져오는 중...' });

    try {
        const productUrls = data.products.map(p => p.productUrl);
        const affShortKeys = data.products.map(p => p.affShortKey);

        // 1. Get all product infos first
        const infoResponse = await fetch("/api/generate-all", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                target_urls: productUrls,
                aff_short_key: affShortKeys
            }),
        });

        if (!infoResponse.ok) {
            const errorResult = await infoResponse.json();
            throw new Error(errorResult.error || `상품 정보 API 오류: ${infoResponse.status}`);
        }

        const infoResult = await infoResponse.json();
        const allInfos = infoResult.allInfos as (AllInfo | null)[];

        if (!allInfos || !Array.isArray(allInfos)) {
            throw new Error("상품 정보를 가져오는 데 실패했습니다. API 응답이 올바르지 않습니다.");
        }
        
        if(allInfos.length !== data.products.length){
            throw new Error("가져온 상품 정보의 개수가 요청한 개수와 다릅니다.");
        }

        setBandPostResult({ status: 'loading', message: '밴드에 글을 게시하는 중...' });

        let successCount = 0;
        const totalCount = data.products.length;

        // 2. Iterate and post to band for each product
        for (const [index, product] of data.products.entries()) {
            const productInfo = allInfos[index];

            if (!productInfo) {
                console.error(`[FRONTEND] 밴드 포스팅 실패 (상품 정보 누락): ${product.productUrl}`);
                continue; // Skip if info not found for this product
            }

            // --- Construct content string ---
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

            if (product.coinDiscountRate) {
                const rateStr = product.coinDiscountRate.replace('%', '').trim();
                const rate = parseFloat(rateStr);
                if (!isNaN(rate)) {
                    const coinDiscountAmount = mainPrice.amount * (rate / 100);
                    finalPriceAmount -= coinDiscountAmount;
                }
            }
            
            const finalPrice = { amount: finalPriceAmount > 0 ? finalPriceAmount : 0, currency: mainPrice.currency };

            let content = `${productInfo.product_title}\n\n`;
            content += `할인판매가: ${formatPrice(mainPrice)}\n`;

            if (product.discountCodePrice && parsePrice(product.discountCodePrice).amount > 0) {
              content += `할인코드: -${formatPrice(parsePrice(product.discountCodePrice))}${product.discountCode ? ` ( ${product.discountCode} )` : ""}\n`;
            }
            if (product.storeCouponPrice && parsePrice(product.storeCouponPrice).amount > 0) {
              content += `스토어쿠폰: -${formatPrice(parsePrice(product.storeCouponPrice))}${product.storeCouponCode ? ` ( ${product.storeCouponCode} )` : ""}\n`;
            }
            if (product.coinDiscountRate) {
              content += `코인할인: ${product.coinDiscountRate ? ` ( ${product.coinDiscountRate} )` : ""}\n`;
            }
            if (product.cardPrice && parsePrice(product.cardPrice).amount > 0) {
              content += `카드할인: -${formatPrice(parsePrice(product.cardPrice))}${product.cardCompanyName ? ` ( ${product.cardCompanyName} )` : ""}\n`;
            }

            content += `\n최대 할인가: ${formatPrice(finalPrice)}\n\n`;
            content += `상품 링크: ${productInfo.final_url}\n`;

            const bandPayload: { content: string; image_url?: string } = { content };
            if (productInfo.product_main_image_url) {
                bandPayload.image_url = productInfo.product_main_image_url;
            }

            // 3. Call the band posting API
            const bandResponse = await fetch("/api/post-to-band", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bandPayload),
            });

            if (bandResponse.ok) {
                successCount++;
            } else {
                console.error(`[FRONTEND] 밴드 포스팅 API 오류: ${product.productUrl}`, await bandResponse.text());
            }
        }
        
        // 4. Final result
        if (successCount === totalCount) {
             setBandPostResult({ status: 'success', message: `총 ${totalCount}개 상품 모두 밴드 글쓰기 성공!` });
             toast({
                title: "성공!",
                description: `총 ${totalCount}개의 상품이 밴드에 성공적으로 게시되었습니다.`,
              });
        } else {
            setBandPostResult({ status: 'error', message: `총 ${totalCount}개 상품 중 ${successCount}개만 밴드 글쓰기 성공. (실패: ${totalCount - successCount}개)` });
             toast({
                variant: "destructive",
                title: "일부 실패",
                description: `총 ${totalCount}개 중 ${totalCount - successCount}개의 상품을 밴드에 게시하지 못했습니다.`,
            });
        }


    } catch (error: any) {
      console.error("[FRONTEND] Error during band posting process:", error);
      setBandPostResult({ status: 'error', message: error.message || "알 수 없는 오류가 발생했습니다." });
      toast({
        variant: "destructive",
        title: "오류 발생",
        description: error.message || "밴드 글쓰기 중 오류가 발생했습니다.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddProduct = () => {
    const products = form.getValues("products");
    const lastProduct = products[products.length - 1];
    append({
        productUrl: "",
        affShortKey: lastProduct?.affShortKey || "",
        productPrice: "",
        coinDiscountRate: "",
        discountCode: "",
        discountCodePrice: "",
        storeCouponCode: "",
        storeCouponPrice: "",
        cardCompanyName: "",
        cardPrice: "",
    });
  };

  const formFields = {
    required: [
        { name: "productUrl", label: "알리익스프레스 상품 URL", placeholder: "https://www.aliexpress.com/...", isRequired: true },
        { name: "affShortKey", label: "제휴 단축 키", placeholder: "예: _onQoGf7", isRequired: true },
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
  
  const getAlertVariant = (status: BandPostStatus): "default" | "destructive" => {
    switch (status) {
        case 'success':
            return 'default';
        case 'error':
            return 'destructive';
        case 'loading':
        case 'idle':
        default:
            return 'default';
    }
  }

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-primary flex items-center justify-center gap-3">
            <Rocket className="h-10 w-10" />
            Aliexpress 밴드 글쓰기
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            상품 정보를 입력하고 밴드에 바로 글을 게시하세요.
          </p>
        </header>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>정보 입력</CardTitle>
            <CardDescription>
              상품 정보와 할인 내역을 입력해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handlePostToBand)}
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
                  onClick={handleAddProduct}
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
                  {isLoading ? "게시 중..." : "밴드 글쓰기"}
                </Button>

                {bandPostResult && bandPostResult.status !== 'idle' && (
                  <Alert variant={getAlertVariant(bandPostResult.status)}>
                    <AlertTitle>
                      {bandPostResult.status === 'loading' && '처리 중'}
                      {bandPostResult.status === 'success' && '성공'}
                      {bandPostResult.status === 'error' && '오류'}
                    </AlertTitle>
                    <AlertDescription>
                      {bandPostResult.message}
                    </AlertDescription>
                  </Alert>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
