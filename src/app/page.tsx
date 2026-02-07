"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Rocket, RefreshCw, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  Subject_title: z.string().optional(),
  productUrl: z.string().url({ message: "유효한 상품 URL을 입력해주세요." }),
  affShortKey: z.string().min(1, { message: "제휴 단축 키를 입력해주세요." }),
  productPrice: z.string().optional(),
  coinDiscountValue: z.string().optional(),
  productTag: z.string().optional(),
  discountCode: z.string().optional(),
  discountCodePrice: z.string().optional(),
  storeCouponCode: z.string().optional(),
  storeCouponPrice: z.string().optional(),
  cardCompanyName: z.string().optional(),
  cardPrice: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SheetData {
  rowNumber: number;
  상품명?: string;
  사이트?: string;
  게시가격?: string;
  게시URL?: string;
  Runtime?: string;
  [key: string]: any;
}

interface CombinedInfo {
    original_url: string;
    final_url: string;
    kakao_urls: string[];
    product_title: string;
    product_main_image_url: string | null;
    sale_volume: number;
    product_id: string;
    total_num: number;
    korean_local_count: number;
    korean_summary: string;
    korean_summary1?: string;
    korean_summary2?: string;
    korean_summary3?: string;
    korean_summary4?: string;
    korean_summary5?: string;
    source_url: string;
}

interface ReviewSelection {
    included: boolean;
    summarized: boolean;
}

type CoinDiscountType = 'rate' | 'amount';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [previewContent, setPreviewContent] = useState("");
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  
  const [isSheetLoading, setIsSheetLoading] = useState(true);
  const [sheetData, setSheetData] = useState<SheetData[]>([]);
  const [selectedRowNumber, setSelectedRowNumber] = useState<number | null>(null);

  const [combinedInfo, setCombinedInfo] = useState<CombinedInfo | null>(null);
  const [coinDiscountType, setCoinDiscountType] = useState<CoinDiscountType>('rate');

  const [reviewSelections, setReviewSelections] = useState<ReviewSelection[]>(
    Array(5).fill({ included: false, summarized: false })
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        Subject_title: "",
        productUrl: "",
        affShortKey: "",
        productPrice: "",
        coinDiscountValue: "",
        productTag: "",
        discountCode: "",
        discountCodePrice: "",
        storeCouponCode: "",
        storeCouponPrice: "",
        cardCompanyName: "",
        cardPrice: "",
    },
  });

  const fetchSheetData = useCallback(async () => {
    setIsSheetLoading(true);
    try {
      const response = await fetch('/api/sheets');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed');
      setSheetData(result.data || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "로딩 오류", description: error.message });
    } finally {
      setIsSheetLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSheetData();
  }, [fetchSheetData]);

  const parsePrice = (price: string | number | undefined | null): number => {
      if (!price) return 0;
      if (typeof price === 'number') return price;
      const parsed = parseFloat(String(price).replace(/[^0-9.-]+/g, ''));
      return isNaN(parsed) ? 0 : parsed;
  };

  const generateHtmlContent = useCallback((info: CombinedInfo | null, selections: ReviewSelection[], currentCoinDiscountType: CoinDiscountType): string => {
    if (!info?.product_title || !info?.final_url) return "";

    const product = form.getValues();
    const isDollar = (originalInput?: string, price?: number): boolean => {
      if (originalInput && originalInput.includes('$')) return true;
      if (price !== undefined && price < 1000 && price > 0) return true;
      return false;
    };
    
    const formatPrice = (price: number, originalInput?: string): string => {
        if (isDollar(originalInput, price)) return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return new Intl.NumberFormat('ko-KR').format(Math.floor(price)) + '원';
    };

    let content = `<p><b>${info.product_title}</b></p><br />`;

    const productPriceNum = parsePrice(product.productPrice);
    const coinDiscountNum = parsePrice(product.coinDiscountValue);
    const discountCodePriceNum = parsePrice(product.discountCodePrice);
    const storeCouponPriceNum = parsePrice(product.storeCouponPrice);
    const cardPriceNum = parsePrice(product.cardPrice);

    let finalPrice = productPriceNum;
    
    if (productPriceNum > 0) {
      content += `<p>할인판매가: ${formatPrice(productPriceNum, product.productPrice)}</p>`;
    }
    
    if (coinDiscountNum > 0 && productPriceNum > 0) {
      if (currentCoinDiscountType === 'rate') {
        const coinValue = isDollar(product.productPrice, productPriceNum) 
            ? Math.round((productPriceNum * (coinDiscountNum / 100)) * 100) / 100
            : Math.floor(productPriceNum * (coinDiscountNum / 100));
        content += `<p>코인할인 ( ${coinDiscountNum}% )</p>`;
        finalPrice -= coinValue;
      } else {
        content += `<p>코인할인: -${formatPrice(coinDiscountNum, product.coinDiscountValue)}</p>`;
        finalPrice -= coinDiscountNum;
      }
    }
    if (discountCodePriceNum > 0 && product.discountCode) {
        content += `<p>할인코드: -${formatPrice(discountCodePriceNum, product.discountCodePrice)} ( ${product.discountCode} )</p>`;
        finalPrice -= discountCodePriceNum;
    }
    if (storeCouponPriceNum > 0 && product.storeCouponCode) {
        content += `<p>스토어쿠폰: -${formatPrice(storeCouponPriceNum, product.storeCouponPrice)} ( ${product.storeCouponCode} )</p>`;
        finalPrice -= storeCouponPriceNum;
    }
    if (cardPriceNum > 0 && product.cardCompanyName) {
        content += `<p>카드할인: -${formatPrice(cardPriceNum, product.cardPrice)} ( ${product.cardCompanyName} )</p>`;
        finalPrice -= cardPriceNum;
    }
    
    if(finalPrice < productPriceNum && productPriceNum > 0) {
        content += `<br /><p><b>최종구매가: ${formatPrice(Math.max(0, finalPrice), product.productPrice)}</b></p>`;
    }
    
    content += `<br /><p>할인상품 : <a href='${info.final_url}'>특가상품 바로가기</a></p><br />`;
    
    const reviewsToAdd = [info.korean_summary1, info.korean_summary2, info.korean_summary3, info.korean_summary4, info.korean_summary5]
    .map((review, index) => ({ review, selection: selections[index] }))
    .filter(({ review, selection }) => review && selection.included)
    .map(({ review, selection }) => {
        let reviewContent = review!.replace(/<[^>]*>?/gm, '').replace(/\*/g, '').trim();
        if (selection.summarized && reviewContent.length > 50) {
            reviewContent = `- ${reviewContent.substring(0, 50)}... <a href='${info.final_url}'>더보기</a>`;
        } else {
            reviewContent = `- ${reviewContent}`;
        }
        return `<p>${reviewContent}</p>`;
    }).join('');

    if(reviewsToAdd) content += `<div><b>리뷰 요약:</b></div><br />${reviewsToAdd}<br />`;
    if (product.productTag) content += `<p>${product.productTag.trim()}</p>`;
    
    content += `<br /><p>링크를 통해 구매가 발생할 시, 일정 수수료를 제공받습니다.</p>`;

    return content;
  }, [form]);
  
  const handleGeneratePreview = async () => {
    const { productUrl, affShortKey } = form.getValues();
    if (!productUrl || !affShortKey) {
        toast({ variant: "destructive", title: "입력 오류", description: "URL과 단축 키를 입력해주세요." });
        return;
    }

    setIsGeneratingPreview(true);
    try {
        const [infoResponse, reviewsResponse] = await Promise.all([
            fetch("/api/generate-all", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ target_urls: [productUrl], aff_short_key: [affShortKey] }),
            }),
            fetch("/api/generate-reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ target_urls: [productUrl] }),
            }),
        ]);
        
        const infoResult = await infoResponse.json();
        const reviewsResult = await reviewsResponse.json();
        
        if (!infoResponse.ok) throw new Error(infoResult.error || '오류');

        const productInfo = infoResult.allInfos[0];
        const reviewData = (Array.isArray(reviewsResult) && reviewsResult.length > 0) ? reviewsResult[0] : null;
        const koreanReviews = (reviewData?.korean_summary || '').split('|').map((s: string) => s.trim()).filter(Boolean);

        const newCombinedInfo: CombinedInfo = {
            original_url: productInfo.original_url,
            final_url: productInfo.final_url,
            kakao_urls: productInfo.kakao_urls || [],
            product_title: productInfo.product_title,
            product_main_image_url: productInfo.product_main_image_url,
            sale_volume: parseInt(productInfo.sale_volume || '0', 10),
            product_id: productInfo.original_url.split('/item/')[1]?.split('.html')[0] || '',
            total_num: reviewData ? parseInt(reviewData.total_num || '0', 10) : 0,
            korean_local_count: reviewData ? parseInt(reviewData.korean_local_count || '0', 10) : 0,
            korean_summary: reviewData?.korean_summary || '',
            korean_summary1: koreanReviews[0] || '',
            korean_summary2: koreanReviews[1] || '',
            korean_summary3: koreanReviews[2] || '',
            korean_summary4: koreanReviews[3] || '',
            korean_summary5: koreanReviews[4] || '',
            source_url: productInfo.original_url
        };
        
        setCombinedInfo(newCombinedInfo);
        setPreviewContent(generateHtmlContent(newCombinedInfo, reviewSelections, coinDiscountType));
    } catch (e: any) {
        toast({ variant: "destructive", title: "미리보기 생성 오류", description: e.message });
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handlePostToNaverCafe = async () => {
    if (!combinedInfo || !previewContent) return;
    setIsLoading(true);
    const product = form.getValues();
    
    try {
      const response = await fetch("/api/post-to-naver-cafe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: product.Subject_title || combinedInfo.product_title,
          content: previewContent,
          image_urls: combinedInfo.product_main_image_url ? [combinedInfo.product_main_image_url] : [],
          club_id: "31609361", 
          menu_id: "2"
        }),
      });
  
      const result = await response.json();
      if (response.ok && result.url) {
          toast({ title: "카페 게시 성공!" });
          if (selectedRowNumber !== null) {
              await fetch('/api/sheets', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ rowNumber: selectedRowNumber, newValues: { checkup: '1' } }),
              });
              setSheetData(prev => prev.filter(d => d.rowNumber !== selectedRowNumber));
          }
      } else {
          throw new Error(result.error || '게시 실패');
      }
    } catch (error: any) {
        toast({ variant: "destructive", title: "오류 발생", description: error.message });
    } finally {
        setIsLoading(false);
    }
  };

  const handleReviewSelectionChange = (index: number, type: 'included' | 'summarized') => {
    setReviewSelections(prev => {
        const newSelections = [...prev];
        const currentSelection = { ...newSelections[index] };
        if (type === 'included') {
            currentSelection.included = !currentSelection.included;
        } else if (type === 'summarized') {
            currentSelection.summarized = !currentSelection.summarized;
        }
        newSelections[index] = currentSelection;
        return newSelections;
    });
  };

  useEffect(() => {
    if(combinedInfo) {
      setPreviewContent(generateHtmlContent(combinedInfo, reviewSelections, coinDiscountType));
    }
  }, [reviewSelections, combinedInfo, generateHtmlContent, coinDiscountType]);

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-primary flex items-center justify-center gap-3">
            <Rocket className="h-10 w-10" />
            Aliexpress 카페 글쓰기
          </h1>
        </header>

         <Card className="shadow-lg mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>작업 대기 목록</CardTitle>
                <Button variant="outline" size="icon" onClick={fetchSheetData} disabled={isSheetLoading}>
                    <RefreshCw className={isSheetLoading ? 'animate-spin' : ''} />
                </Button>
            </CardHeader>
            <CardContent>
              {isSheetLoading ? (
                 <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : (
                <Carousel className="w-full">
                  <CarouselContent>
                    {sheetData.map((item) => (
                      <CarouselItem key={item.rowNumber}>
                        <Card className={selectedRowNumber === item.rowNumber ? "border-primary" : ""}>
                          <CardHeader><CardTitle className="truncate">{item.상품명}</CardTitle></CardHeader>
                          <CardContent>
                              <Button onClick={() => {
                                  setSelectedRowNumber(item.rowNumber);
                                  form.setValue("Subject_title", item.상품명 || "");
                                  form.setValue("productUrl", item.게시URL || "");
                              }} className="w-full">선택</Button>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious /><CarouselNext />
                </Carousel>
              )}
            </CardContent>
        </Card>
        
        <Card className="shadow-lg mb-8">
            <CardHeader><CardTitle>정보 입력</CardTitle></CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handlePostToNaverCafe)} className="space-y-6">
                        <FormField control={form.control} name="Subject_title" render={({ field }) => (
                            <FormItem>
                                <FormLabel>제목</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="productUrl" render={({ field }) => (
                            <FormItem><FormLabel>알리 URL</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                        )} />

                        <FormField control={form.control} name="affShortKey" render={({ field }) => (
                            <FormItem><FormLabel>단축 키</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                        )} />

                        <Button type="button" onClick={handleGeneratePreview} className="w-full" disabled={isGeneratingPreview}>
                            {isGeneratingPreview ? <Loader2 className="animate-spin mr-2" /> : <Eye className="mr-2" />} 미리보기 생성
                        </Button>

                        {combinedInfo && (
                            <div className="mt-6 space-y-6">
                                <div className="border rounded-lg p-4 bg-gray-50">
                                    <div dangerouslySetInnerHTML={{ __html: previewContent }} className="max-h-80 overflow-auto text-sm" />
                                </div>
                                <div className="space-y-3">
                                    <p className="text-sm font-semibold">리뷰 선택</p>
                                    {[combinedInfo.korean_summary1, combinedInfo.korean_summary2, combinedInfo.korean_summary3, combinedInfo.korean_summary4, combinedInfo.korean_summary5].filter(Boolean).map((review, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 border rounded-md bg-white">
                                            <span className="text-xs truncate flex-1 mr-2">{review}</span>
                                            <Checkbox checked={reviewSelections[i].included} onCheckedChange={() => handleReviewSelectionChange(i, 'included')} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <Button type="submit" className="w-full py-6 text-lg" disabled={isLoading || !previewContent}>
                            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Rocket className="mr-2" />} 카페 게시하기
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
      </div>
    </main>
  );
}
