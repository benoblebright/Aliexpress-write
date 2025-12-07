
"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Rocket, Plus, Trash2, ChevronDown, CheckCircle, XCircle } from "lucide-react";

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
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";


const productSchema = z.object({
  productUrl: z.string().url({ message: "유효한 상품 URL을 입력해주세요." }),
  affShortKey: z.string().min(1, { message: "제휴 단축 키를 입력해주세요." }),
  productPrice: z.string().optional(),
  coinDiscountRate: z.string().optional(),
  productTag: z.string().optional(),
  discountCode: z.string().optional(),
  discountCodePrice: z.string().optional(),
  storeCouponCode: z.string().optional(),
  storeCouponPrice: z.string().optional(),
  cardCompanyName: z.string().optional(),
  cardPrice: z.string().optional(),
  // For sheet matching
  rowNumber: z.number().optional(),
});

const formSchema = z.object({
  products: z.array(productSchema).min(1, "최소 1개의 상품을 추가해야 합니다."),
});

type FormData = z.infer<typeof formSchema>;

interface AllInfo {
    product_main_image_url: string;
    product_title: string;
    final_url: string;
    original_url: string;
    sale_volume?: string | number;
    korean_summary?: string;
    korean_local_count?: number;
    total_num?: number;
}

interface SheetRow {
    rowNumber: number;
    상품명: string;
    URL: string;
    Runtime: string;
    사이트: string;
    가격: string;
    checkup: string;
}

type BandPostStatus = 'idle' | 'success' | 'error' | 'loading';
interface BandPostResult {
    status: BandPostStatus;
    message: string;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSheetLoading, setIsSheetLoading] = useState(true);
  const { toast } = useToast();
  const [bandPostResult, setBandPostResult] = useState<BandPostResult | null>(null);
  const [sheetData, setSheetData] = useState<SheetRow[]>([]);

  useEffect(() => {
    async function fetchSheetData() {
        try {
            setIsSheetLoading(true);
            const response = await fetch('/api/sheets');
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || '스프레드시트 데이터를 가져오는데 실패했습니다.');
            }
            const result = await response.json();
            setSheetData(result.data);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: '시트 데이터 로딩 오류',
                description: error.message,
            });
        } finally {
            setIsSheetLoading(false);
        }
    }
    fetchSheetData();
  }, [toast]);


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      products: [
        {
          productUrl: "",
          affShortKey: "",
          productPrice: "",
          coinDiscountRate: "",
          productTag: "",
        },
      ],
    },
  });

  const { fields, append, remove, setValue } = useFieldArray({
    control: form.control,
    name: "products",
  });
  
    const parsePrice = (price: string | number | undefined | null): number => {
        if (price === undefined || price === null || price === '') return 0;
        if (typeof price === 'number') return price;
        const parsed = parseFloat(String(price).replace(/[^0-9.-]+/g, ''));
        return isNaN(parsed) ? 0 : parsed;
    };

    const formatPrice = (price: number): string => {
        return new Intl.NumberFormat('ko-KR').format(price) + '원';
    };

  const handlePostToBand = async (data: FormData) => {
    setIsLoading(true);
    setBandPostResult({ status: 'loading', message: '상품 정보를 가져오는 중...' });

    try {
        const productUrls = data.products.map(p => p.productUrl);
        const affShortKeys = data.products.map(p => p.affShortKey);

        const infoResponse = await fetch("/api/generate-all", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                target_urls: productUrls,
                aff_short_key: affShortKeys
            }),
        });
        
        const infoResult = await infoResponse.json();

        if (!infoResponse.ok) {
            const errorMessage = infoResult.error || `상품 정보 API 오류: ${infoResponse.status}`;
            const errorDetails = infoResult.details ? `\n\n[상세 정보]\n${JSON.stringify(infoResult.details, null, 2)}` : '';
            throw new Error(`${errorMessage}${errorDetails}`);
        }

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
        const errorMessages: string[] = [];

        for (const [index, product] of data.products.entries()) {
            const productInfo = allInfos[index];

            if (!productInfo || !productInfo.product_title || !productInfo.final_url) {
                errorMessages.push(`상품 ${index + 1} (${product.productUrl}) : 필수 정보(상품명 또는 최종 링크)를 가져오지 못해 건너뛰었습니다.`);
                continue;
            }

            let content = `${productInfo.product_title}\n\n`;

            const productPriceNum = parsePrice(product.productPrice);
            const coinDiscountRateNum = parsePrice(product.coinDiscountRate);
            const discountCodePriceNum = parsePrice(product.discountCodePrice);
            const storeCouponPriceNum = parsePrice(product.storeCouponPrice);
            const cardPriceNum = parsePrice(product.cardPrice);

            let finalPrice = productPriceNum;
            
            if (productPriceNum > 0) {
              content += `할인판매가: ${formatPrice(productPriceNum)}\n`;
            }
            
            if (coinDiscountRateNum > 0) {
              content += `코인할인 ( ${coinDiscountRateNum}% )\n`;
              const coinDiscountValue = productPriceNum * (coinDiscountRateNum / 100);
              finalPrice -= coinDiscountValue;
            }
            if (discountCodePriceNum > 0 && product.discountCode) {
                content += `할인코드: -${formatPrice(discountCodePriceNum)} ( ${product.discountCode} )\n`;
                finalPrice -= discountCodePriceNum;
            }
             if (storeCouponPriceNum > 0 && product.storeCouponCode) {
                content += `스토어쿠폰: -${formatPrice(storeCouponPriceNum)} ( ${product.storeCouponCode} )\n`;
                finalPrice -= storeCouponPriceNum;
            }
            if (cardPriceNum > 0 && product.cardCompanyName) {
                content += `카드할인: -${formatPrice(cardPriceNum)} ( ${product.cardCompanyName} )\n`;
                finalPrice -= cardPriceNum;
            }
            
            if(finalPrice < productPriceNum) {
                content += `\n할인구매가: ${formatPrice(finalPrice)}\n`;
            }
            content += `\n상품 링크: ${productInfo.final_url}\n`;

            if (product.productTag) {
                const tags = product.productTag.split(' ').map(tag => tag.trim()).filter(tag => tag).map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
                if (tags) {
                    content += `\n${tags}`;
                }
            }

            const bandPayload: { content: string; image_url?: string } = { content };
            if (productInfo.product_main_image_url) {
                bandPayload.image_url = productInfo.product_main_image_url;
            }

            const bandResponse = await fetch("/api/post-to-band", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bandPayload),
            });

            if (bandResponse.ok) {
                successCount++;
                 if (product.rowNumber) {
                     // Update sheet
                    await fetch('/api/sheets', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rowNumber: product.rowNumber, column: 'checkup', value: '2' }),
                    });
                     // Also update other fields if needed, for simplicity we only update checkup
                 }
            } else {
                try {
                    const bandErrorResult = await bandResponse.json();
                    const bandErrorMessage = bandErrorResult.error || `Status: ${bandResponse.status}`;
                    errorMessages.push(`상품 ${index + 1} (${product.productUrl}) 실패: ${bandErrorMessage}`);
                } catch {
                     const errorText = await bandResponse.text();
                     errorMessages.push(`상품 ${index + 1} (${product.productUrl}) 실패: ${errorText || `Status: ${bandResponse.status}`}`);
                }
            }
        }

        if (successCount === totalCount) {
             setBandPostResult({ status: 'success', message: `총 ${totalCount}개 상품 모두 밴드 글쓰기 성공!` });
             toast({
                title: "성공!",
                description: `총 ${totalCount}개의 상품이 밴드에 성공적으로 게시되었습니다.`,
              });
        } else {
            const finalErrorMessage = `총 ${totalCount}개 상품 중 ${successCount}개 성공 / ${totalCount - successCount}개 실패\n\n[오류 내역]\n${errorMessages.join('\n')}`;
            setBandPostResult({ status: 'error', message: finalErrorMessage });
             toast({
                variant: "destructive",
                title: "일부 실패",
                description: `총 ${totalCount}개 중 ${totalCount - successCount}개의 상품을 밴드에 게시하지 못했습니다.`,
            });
        }
    } catch (error: any) {
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
        productTag: "",
        discountCode: "",
        discountCodePrice: "",
        storeCouponCode: "",
        storeCouponPrice: "",
        cardCompanyName: "",
        cardPrice: "",
    });
  };

  const handleSelectSheetRow = (row: SheetRow) => {
    // We will populate the first product form.
    // If you want to add a new form instead, the logic can be changed.
    setValue('products.0.productUrl', row.URL);
    setValue('products.0.productPrice', row.가격);
    setValue('products.0.rowNumber', row.rowNumber); // Keep track of the row
    toast({
        title: "상품 정보 적용",
        description: `'${row.상품명}'의 정보가 상품 1에 적용되었습니다.`
    })
  };

  const handleDeleteSheetRow = async (row: SheetRow) => {
    // Optimistically remove from UI
    setSheetData(prev => prev.filter(item => item.rowNumber !== row.rowNumber));

    try {
        const response = await fetch('/api/sheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rowNumber: row.rowNumber, column: 'checkup', value: '1' }),
        });
        const result = await response.json();
        if(!response.ok) {
            throw new Error(result.error || "시트 업데이트에 실패했습니다.")
        }
        toast({
            title: "상품 삭제됨",
            description: `'${row.상품명}'이(가) 목록에서 삭제 처리되었습니다.`
        });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "시트 업데이트 오류",
            description: error.message,
        });
        // Re-add the item to the list if the API call fails
        setSheetData(prev => [...prev, row].sort((a,b) => a.rowNumber - b.rowNumber));
    }
  };


  const formFields = {
    required: [
        { name: "productUrl", label: "알리익스프레스 상품 URL", placeholder: "https://www.aliexpress.com/...", isRequired: true },
        { name: "affShortKey", label: "제휴 단축 키", placeholder: "예: _onQoGf7", isRequired: true },
        { name: "productPrice", label: "상품판매가", placeholder: "예: 25 또는 30000원", isRequired: false },
        { name: "coinDiscountRate", label: "코인할인율", placeholder: "예: 10 또는 10%", isRequired: false },
        { name: "productTag", label: "상품태그", placeholder: "예: #캠핑 #가성비 (띄어쓰기로 구분)", isRequired: false },
    ],
    collapsible: [
        { name: "discountCode", label: "할인코드", placeholder: "예: KR1234", type: "text" },
        { name: "discountCodePrice", label: "할인코드 할인가", placeholder: "예: 5 또는 5000원", type: "text" },
        { name: "storeCouponCode", label: "스토어쿠폰 코드", placeholder: "예: STORE1000", type: "text" },
        { name: "storeCouponPrice", label: "스토어쿠폰 코드 할인가", placeholder: "예: 2 또는 2000원", type: "text" },
        { name: "cardCompanyName", label: "카드사명", placeholder: "예: 카카오페이", type: "text" },
        { name: "cardPrice", label: "카드할인가", placeholder: "예: 3 또는 3000원", type: "text" },
    ]
  };
  
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
  };

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

        <Card className="shadow-lg mb-8">
            <CardHeader>
                <CardTitle>작업 대기 목록</CardTitle>
                <CardDescription>
                    구글 시트에서 가져온 작업 대기중인 상품 목록입니다.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isSheetLoading ? (
                    <div className="flex justify-center items-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : sheetData.length > 0 ? (
                    <Carousel className="w-full" opts={{ align: "start", loop: false }}>
                        <CarouselContent>
                            {sheetData.map((item) => (
                                <CarouselItem key={item.rowNumber} className="md:basis-1/2 lg:basis-1/3">
                                    <div className="p-1">
                                        <Card className="h-full flex flex-col">
                                            <CardHeader>
                                                <CardTitle className="text-base line-clamp-2">{item.상품명}</CardTitle>
                                                <CardDescription>{item.가격}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="flex-grow text-xs space-y-1">
                                               <p><strong>사이트:</strong> {item.사이트}</p>
                                               <p><strong>URL:</strong> <a href={item.URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">{item.URL}</a></p>
                                               <p><strong>Runtime:</strong> {item.Runtime}</p>
                                            </CardContent>
                                            <div className="flex border-t">
                                                <Button variant="ghost" className="w-1/2 rounded-none rounded-bl-lg" onClick={() => handleSelectSheetRow(item)}>
                                                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                                    선택
                                                </Button>
                                                <Separator orientation="vertical" className="h-auto" />
                                                <Button variant="ghost" className="w-1/2 rounded-none rounded-br-lg" onClick={() => handleDeleteSheetRow(item)}>
                                                    <XCircle className="h-4 w-4 mr-2 text-red-500"/>
                                                    삭제
                                                </Button>
                                            </div>
                                        </Card>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious />
                        <CarouselNext />
                    </Carousel>
                ) : (
                    <p className="text-center text-muted-foreground py-4">작업 대기중인 상품이 없습니다.</p>
                )}
            </CardContent>
        </Card>


        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>정보 입력</CardTitle>
            <CardDescription>
              글을 쓸 상품의 URL과 제휴 키를 입력해주세요.
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
                        name={`products.${index}.${fieldInfo.name as 'productUrl' | 'affShortKey' | 'productPrice' | 'coinDiscountRate' | 'productTag'}`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {fieldInfo.label}
                              {fieldInfo.isRequired && <span className="text-destructive"> *</span>}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={fieldInfo.placeholder}
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
                                  추가 할인 정보 입력 (선택)
                              </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-4 pt-4">
                              {formFields.collapsible.map((fieldInfo) => (
                                  <FormField
                                  key={`${item.id}-${fieldInfo.name}`}
                                  control={form.control}
                                  name={`products.${index}.${fieldInfo.name as 'discountCode' | 'discountCodePrice' | 'storeCouponCode' | 'storeCouponPrice' | 'cardCompanyName' | 'cardPrice'}`}
                                  render={({ field }) => (
                                      <FormItem>
                                      <FormLabel>
                                          {fieldInfo.label}
                                      </FormLabel>
                                      <FormControl>
                                          <Input
                                          type={fieldInfo.type}
                                          placeholder={fieldInfo.placeholder}
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
                      <pre className="whitespace-pre-wrap font-sans">{bandPostResult.message}</pre>
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

    