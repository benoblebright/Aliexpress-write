
"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Rocket, RefreshCw, Eye, Tag, DollarSign, Percent, CreditCard, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
    Array(5).fill({ included: true, summarized: false })
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

    let content = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">`;
    content += `<p style="font-size: 18px; font-weight: bold; color: #333;">${info.product_title}</p><br />`;

    if (info.product_main_image_url) {
        content += `<img src="${info.product_main_image_url}" style="width: 100%; border-radius: 8px; margin-bottom: 20px;" /><br />`;
    }

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
        content += `<p>코인할인: -${formatPrice(coinValue, product.productPrice)} ( ${coinDiscountNum}% )</p>`;
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
        content += `<p style="font-size: 20px; color: #ff5000;"><b>최종구매가: ${formatPrice(Math.max(0, finalPrice), product.productPrice)}</b></p>`;
    }
    
    content += `<br /><p>👉 <a href='${info.final_url}' style="color: #0070f3; text-decoration: none; font-weight: bold;">특가상품 바로가기</a></p><br />`;
    
    const reviewsToAdd = [info.korean_summary1, info.korean_summary2, info.korean_summary3, info.korean_summary4, info.korean_summary5]
    .map((review, index) => ({ review, selection: selections[index] }))
    .filter(({ review, selection }) => review && selection.included)
    .map(({ review, selection }) => {
        let reviewContent = review!.replace(/<[^>]*>?/gm, '').replace(/\*/g, '').trim();
        if (selection.summarized && reviewContent.length > 50) {
            reviewContent = `${reviewContent.substring(0, 50)}...`;
        }
        return `<li style="margin-bottom: 8px;">${reviewContent}</li>`;
    }).join('');

    if(reviewsToAdd) {
        content += `<div style="background-color: #f7f7f7; padding: 15px; border-radius: 8px; margin-top: 20px;">`;
        content += `<p style="font-weight: bold; margin-top: 0;">실제 구매자 리뷰 요약:</p>`;
        content += `<ul style="padding-left: 20px; margin-bottom: 0;">${reviewsToAdd}</ul>`;
        content += `</div><br />`;
    }

    if (product.productTag) {
        content += `<p style="color: #666; font-size: 13px;">${product.productTag.trim()}</p>`;
    }
    
    content += `<p style="color: #999; font-size: 12px; margin-top: 20px;">* 해당 링크를 통해 구매가 발생할 시, 제휴 마케팅 활동의 일환으로 일정액의 수수료를 제공받을 수 있습니다.</p>`;
    content += `</div>`;

    return content;
  }, [form]);
  
  const handleGeneratePreview = async () => {
    const values = form.getValues();
    if (!values.productUrl || !values.affShortKey) {
        toast({ variant: "destructive", title: "입력 오류", description: "URL과 단축 키를 입력해주세요." });
        return;
    }

    setIsGeneratingPreview(true);
    try {
        const [infoResponse, reviewsResponse] = await Promise.all([
            fetch("/api/generate-all", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ target_urls: [values.productUrl], aff_short_key: [values.affShortKey] }),
            }),
            fetch("/api/generate-reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ target_urls: [values.productUrl] }),
            }),
        ]);
        
        const infoResult = await infoResponse.json();
        const reviewsResult = await reviewsResponse.json();
        
        if (!infoResponse.ok) throw new Error(infoResult.error || '정보를 가져오는데 실패했습니다.');

        const productInfo = infoResult.allInfos[0];
        const reviewData = (Array.isArray(reviewsResult) && reviewsResult.length > 0) ? reviewsResult[0] : null;
        const koreanReviews = (reviewData?.korean_summary || '').split('|').map((s: string) => s.trim()).filter(Boolean);

        const newCombinedInfo: CombinedInfo = {
            original_url: productInfo.original_url,
            final_url: productInfo.final_url,
            kakao_urls: productInfo.kakao_urls || [],
            product_title: productInfo.product_title || values.Subject_title || "알리익스프레스 추천 상품",
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
        if (!values.Subject_title) {
            form.setValue("Subject_title", newCombinedInfo.product_title);
        }
        
        setPreviewContent(generateHtmlContent(newCombinedInfo, reviewSelections, coinDiscountType));
        toast({ title: "데이터 생성 완료", description: "할인 정보를 입력하고 카페에 게시하세요." });
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
          toast({ title: "카페 게시 성공!", description: "네이버 카페에 게시물이 등록되었습니다." });
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

  const handleReviewSelectionChange = (index: number) => {
    setReviewSelections(prev => {
        const newSelections = [...prev];
        newSelections[index] = { ...newSelections[index], included: !newSelections[index].included };
        return newSelections;
    });
  };

  useEffect(() => {
    if(combinedInfo) {
      setPreviewContent(generateHtmlContent(combinedInfo, reviewSelections, coinDiscountType));
    }
  }, [reviewSelections, combinedInfo, generateHtmlContent, coinDiscountType]);

  return (
    <main className="min-h-screen bg-neutral-50 p-4 sm:p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Rocket className="h-12 w-12 text-primary animate-pulse" />
            <h1 className="text-4xl font-black tracking-tighter text-neutral-900">
                ALI<span className="text-primary">CAFE</span> HELPER
            </h1>
          </div>
          <p className="text-neutral-500 font-medium">알리익스프레스 상품 포스팅을 위한 가장 스마트한 도구</p>
        </header>

         <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="bg-neutral-900 text-white flex flex-row items-center justify-between py-4">
                <div>
                    <CardTitle className="text-lg">작업 대기 목록</CardTitle>
                    <CardDescription className="text-neutral-400">구글 시트에서 불러온 상품들</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={fetchSheetData} disabled={isSheetLoading} className="text-white hover:bg-neutral-800">
                    <RefreshCw className={isSheetLoading ? 'animate-spin' : ''} />
                </Button>
            </CardHeader>
            <CardContent className="pt-6">
              {isSheetLoading ? (
                 <div className="flex flex-col items-center justify-center p-10 gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm text-neutral-500">시트 데이터를 불러오는 중...</p>
                 </div>
              ) : sheetData.length > 0 ? (
                <Carousel className="w-full">
                  <CarouselContent className="-ml-2 md:-ml-4">
                    {sheetData.map((item) => (
                      <CarouselItem key={item.rowNumber} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                        <div 
                            className={`group cursor-pointer p-4 border-2 rounded-xl transition-all hover:shadow-md ${selectedRowNumber === item.rowNumber ? "border-primary bg-primary/5" : "border-neutral-100 bg-white"}`}
                            onClick={() => {
                                setSelectedRowNumber(item.rowNumber);
                                form.setValue("Subject_title", item.상품명 || "");
                                form.setValue("productUrl", item.게시URL || "");
                                toast({ title: "상품 선택됨", description: item.상품명 });
                            }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant={selectedRowNumber === item.rowNumber ? "default" : "secondary"} className="text-[10px]">ROW {item.rowNumber}</Badge>
                            <span className="text-[10px] text-neutral-400">{item.Runtime ? new Date(item.Runtime).toLocaleDateString() : ''}</span>
                          </div>
                          <h3 className="font-bold text-sm line-clamp-2 min-h-[40px] mb-2 group-hover:text-primary transition-colors">{item.상품명}</h3>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-neutral-500 truncate">{item.사이트 || 'Aliexpress'}</p>
                            {item.게시URL && (
                                <a href={item.게시URL} target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-primary" onClick={(e) => e.stopPropagation()}>
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            )}
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <div className="flex justify-end gap-2 mt-4">
                    <CarouselPrevious className="static translate-y-0" />
                    <CarouselNext className="static translate-y-0" />
                  </div>
                </Carousel>
              ) : (
                <div className="text-center py-10 text-neutral-500">대기 중인 작업이 없습니다.</div>
              )}
            </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
                <Card className="border-none shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Tag className="h-5 w-5 text-primary" />
                            기본 정보
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form className="space-y-4">
                                <FormField control={form.control} name="productUrl" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase text-neutral-500">알리익스프레스 상품 URL</FormLabel>
                                        <FormControl><Input {...field} placeholder="https://aliexpress.com/item/..." className="bg-neutral-50 border-none h-12" /></FormControl>
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="affShortKey" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase text-neutral-500">제휴 단축 키 (Affiliate Key)</FormLabel>
                                        <FormControl><Input {...field} placeholder="단축 키 입력" className="bg-neutral-50 border-none h-12" /></FormControl>
                                    </FormItem>
                                )} />

                                <Button type="button" onClick={handleGeneratePreview} className="w-full h-14 text-lg font-bold shadow-lg" variant="default" disabled={isGeneratingPreview}>
                                    {isGeneratingPreview ? <Loader2 className="animate-spin mr-2" /> : <Eye className="mr-2" />} 
                                    {isGeneratingPreview ? "상품 정보 분석 중..." : "상품 정보 분석 및 미리보기"}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {combinedInfo && (
                    <Card className="border-none shadow-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-primary" />
                                할인 상세 정보
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Form {...form}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="productPrice" render={({ field }) => (
                                        <FormItem className="col-span-full">
                                            <FormLabel className="text-xs font-bold uppercase text-neutral-500">할인판매가</FormLabel>
                                            <FormControl><Input {...field} placeholder="예: $15.50 또는 21000" className="bg-neutral-50 border-none" /></FormControl>
                                        </FormItem>
                                    )} />

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-neutral-500">코인할인</Label>
                                        <div className="flex gap-2">
                                            <Input 
                                                className="bg-neutral-50 border-none" 
                                                placeholder={coinDiscountType === 'rate' ? "할인율(%)" : "할인금액"}
                                                onChange={(e) => form.setValue("coinDiscountValue", e.target.value)}
                                            />
                                            <Button 
                                                type="button" 
                                                variant={coinDiscountType === 'rate' ? "default" : "outline"} 
                                                size="sm" 
                                                onClick={() => setCoinDiscountType('rate')}
                                            ><Percent className="h-4 w-4" /></Button>
                                            <Button 
                                                type="button" 
                                                variant={coinDiscountType === 'amount' ? "default" : "outline"} 
                                                size="sm" 
                                                onClick={() => setCoinDiscountType('amount')}
                                            ><DollarSign className="h-4 w-4" /></Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <FormField control={form.control} name="discountCode" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-neutral-500">할인코드</FormLabel>
                                                <FormControl><Input {...field} placeholder="코드명" className="bg-neutral-50 border-none" /></FormControl>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="discountCodePrice" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-neutral-500">코드 할인액</FormLabel>
                                                <FormControl><Input {...field} placeholder="금액" className="bg-neutral-50 border-none" /></FormControl>
                                            </FormItem>
                                        )} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <FormField control={form.control} name="storeCouponCode" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-neutral-500">스토어쿠폰</FormLabel>
                                                <FormControl><Input {...field} placeholder="쿠폰명" className="bg-neutral-50 border-none" /></FormControl>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="storeCouponPrice" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-neutral-500">쿠폰 할인액</FormLabel>
                                                <FormControl><Input {...field} placeholder="금액" className="bg-neutral-50 border-none" /></FormControl>
                                            </FormItem>
                                        )} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <FormField control={form.control} name="cardCompanyName" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-neutral-500">카드사할인</FormLabel>
                                                <FormControl><Input {...field} placeholder="카드사명" className="bg-neutral-50 border-none" /></FormControl>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="cardPrice" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-neutral-500">카드 할인액</FormLabel>
                                                <FormControl><Input {...field} placeholder="금액" className="bg-neutral-50 border-none" /></FormControl>
                                            </FormItem>
                                        )} />
                                    </div>
                                    
                                    <FormField control={form.control} name="productTag" render={({ field }) => (
                                        <FormItem className="col-span-full">
                                            <FormLabel className="text-xs font-bold uppercase text-neutral-500">추가 태그 (해시태그)</FormLabel>
                                            <FormControl><Input {...field} placeholder="#알리익스프레스 #가성비템" className="bg-neutral-50 border-none" /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                            </Form>

                            <Separator />

                            <div className="space-y-4">
                                <h4 className="text-sm font-bold flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-primary" />
                                    구매자 리뷰 요약 (포함할 리뷰 선택)
                                </h4>
                                <div className="space-y-2">
                                    {[combinedInfo.korean_summary1, combinedInfo.korean_summary2, combinedInfo.korean_summary3, combinedInfo.korean_summary4, combinedInfo.korean_summary5].filter(Boolean).map((review, i) => (
                                        <div key={i} className={`flex items-start gap-3 p-3 border-2 rounded-lg transition-all ${reviewSelections[i].included ? "border-primary/20 bg-primary/5" : "border-neutral-50 bg-neutral-50/50"}`}>
                                            <Checkbox 
                                                id={`review-${i}`} 
                                                checked={reviewSelections[i].included} 
                                                onCheckedChange={() => handleReviewSelectionChange(i)} 
                                                className="mt-1"
                                            />
                                            <label htmlFor={`review-${i}`} className="text-sm cursor-pointer leading-tight text-neutral-700">{review}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="lg:col-span-5 space-y-6">
                <Card className="border-none shadow-xl sticky top-8">
                    <CardHeader className="bg-primary text-white py-4">
                        <CardTitle className="text-lg flex items-center justify-between">
                            최종 미리보기
                            <Badge variant="secondary" className="bg-white/20 text-white border-none">HTML MODE</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="p-6">
                            <Form {...form}>
                                <FormField control={form.control} name="Subject_title" render={({ field }) => (
                                    <FormItem className="mb-4">
                                        <FormLabel className="text-xs font-bold uppercase text-neutral-500">카페 게시물 제목</FormLabel>
                                        <FormControl><Input {...field} placeholder="카페에 게시될 제목" className="bg-neutral-50 border-none font-bold" /></FormControl>
                                    </FormItem>
                                )} />
                            </Form>
                            
                            <div className="border rounded-xl bg-white p-4 h-[450px] overflow-auto shadow-inner text-sm leading-relaxed">
                                {previewContent ? (
                                    <div dangerouslySetInnerHTML={{ __html: previewContent }} className="prose prose-neutral prose-sm max-w-none" />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-neutral-400 gap-2">
                                        <Eye className="h-10 w-10 opacity-20" />
                                        <p>미리보기가 여기에 표시됩니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="px-6 pb-6">
                            <Button 
                                onClick={handlePostToNaverCafe} 
                                className="w-full h-16 text-xl font-black shadow-lg shadow-primary/20" 
                                disabled={isLoading || !previewContent}
                            >
                                {isLoading ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <Rocket className="mr-2 h-6 w-6" />} 
                                {isLoading ? "게시 중..." : "네이버 카페 게시하기"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
      <footer className="mt-20 text-center text-neutral-400 text-xs">
          © 2024 ALICAFE HELPER. All rights reserved.
      </footer>
    </main>
  );
}
