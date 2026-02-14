
"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Rocket, RefreshCw, Eye, Tag, DollarSign, Percent, CreditCard, ExternalLink, CheckCircle2 } from "lucide-react";

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
  checkup?: string;
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

    let content = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">`;
    content += `<p style="font-size: 20px; font-weight: bold; color: #111; margin-bottom: 15px;">${info.product_title}</p>`;

    if (info.product_main_image_url) {
        content += `<div style="text-align: center; margin-bottom: 25px;"><img src="${info.product_main_image_url}" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" /></div>`;
    }

    const productPriceNum = parsePrice(product.productPrice);
    const coinDiscountNum = parsePrice(product.coinDiscountValue);
    const discountCodePriceNum = parsePrice(product.discountCodePrice);
    const storeCouponPriceNum = parsePrice(product.storeCouponPrice);
    const cardPriceNum = parsePrice(product.cardPrice);

    let finalPrice = productPriceNum;
    
    let priceDetails = "";
    if (productPriceNum > 0) {
      priceDetails += `<p style="margin: 5px 0;">할인판매가: <span style="text-decoration: line-through; color: #888;">${formatPrice(productPriceNum, product.productPrice)}</span></p>`;
    }
    
    if (coinDiscountNum > 0 && productPriceNum > 0) {
      if (currentCoinDiscountType === 'rate') {
        const coinValue = isDollar(product.productPrice, productPriceNum) 
            ? Math.round((productPriceNum * (coinDiscountNum / 100)) * 100) / 100
            : Math.floor(productPriceNum * (coinDiscountNum / 100));
        priceDetails += `<p style="margin: 5px 0; color: #ff5000;">코인할인: -${formatPrice(coinValue, product.productPrice)} ( ${coinDiscountNum}% )</p>`;
        finalPrice -= coinValue;
      } else {
        priceDetails += `<p style="margin: 5px 0; color: #ff5000;">코인할인: -${formatPrice(coinDiscountNum, product.coinDiscountValue)}</p>`;
        finalPrice -= coinDiscountNum;
      }
    }
    if (discountCodePriceNum > 0 && product.discountCode) {
        priceDetails += `<p style="margin: 5px 0; color: #ff5000;">할인코드: -${formatPrice(discountCodePriceNum, product.discountCodePrice)} ( ${product.discountCode} )</p>`;
        finalPrice -= discountCodePriceNum;
    }
    if (storeCouponPriceNum > 0 && product.storeCouponCode) {
        priceDetails += `<p style="margin: 5px 0; color: #ff5000;">스토어쿠폰: -${formatPrice(storeCouponPriceNum, product.storeCouponPrice)} ( ${product.storeCouponCode} )</p>`;
        finalPrice -= storeCouponPriceNum;
    }
    if (cardPriceNum > 0 && product.cardCompanyName) {
        priceDetails += `<p style="margin: 5px 0; color: #ff5000;">카드할인: -${formatPrice(cardPriceNum, product.cardPrice)} ( ${product.cardCompanyName} )</p>`;
        finalPrice -= cardPriceNum;
    }
    
    if (priceDetails) {
        content += `<div style="background: #fff9f5; padding: 15px; border-left: 4px solid #ff5000; border-radius: 4px; margin-bottom: 20px;">${priceDetails}</div>`;
    }

    if(finalPrice > 0) {
        content += `<p style="font-size: 24px; color: #ff5000; margin-bottom: 25px;"><b>최종구매가: ${formatPrice(Math.max(0, finalPrice), product.productPrice)}</b></p>`;
    }
    
    content += `<div style="text-align: center; margin: 30px 0;">`;
    content += `<a href='${info.final_url}' style="background-color: #ff5000; color: #fff; text-decoration: none; padding: 15px 30px; border-radius: 30px; font-weight: bold; font-size: 18px; display: inline-block;">🔥 특가상품 바로가기 🔥</a>`;
    content += `</div>`;
    
    const reviewsToAdd = [info.korean_summary1, info.korean_summary2, info.korean_summary3, info.korean_summary4, info.korean_summary5]
    .map((review, index) => ({ review, selection: selections[index] }))
    .filter(({ review, selection }) => review && selection.included)
    .map(({ review, selection }) => {
        let reviewContent = review!.replace(/<[^>]*>?/gm, '').replace(/\*/g, '').trim();
        if (selection.summarized && reviewContent.length > 50) {
            reviewContent = `${reviewContent.substring(0, 50)}...`;
        }
        return `<li style="margin-bottom: 10px; border-bottom: 1px dashed #eee; padding-bottom: 5px;">${reviewContent}</li>`;
    }).join('');

    if(reviewsToAdd) {
        content += `<div style="background-color: #fcfcfc; padding: 20px; border: 1px solid #eee; border-radius: 12px; margin-top: 30px;">`;
        content += `<p style="font-weight: bold; margin-top: 0; color: #111; font-size: 16px;">⭐ 실제 구매자 리뷰 요약:</p>`;
        content += `<ul style="padding-left: 15px; margin-bottom: 0; list-style-type: none;">${reviewsToAdd}</ul>`;
        content += `</div>`;
    }

    if (product.productTag) {
        content += `<p style="color: #888; font-size: 13px; margin-top: 25px;">${product.productTag.trim()}</p>`;
    }
    
    content += `<hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />`;
    content += `<p style="color: #999; font-size: 12px;">* 해당 링크를 통해 구매가 발생할 시, 제휴 마케팅 활동의 일환으로 일정액의 수수료를 제공받을 수 있습니다.</p>`;
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
    <main className="min-h-screen bg-[#f8f9fb] p-4 sm:p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="text-center space-y-4 mb-12">
          <div className="flex items-center justify-center gap-3">
            <div className="bg-primary p-2 rounded-2xl shadow-lg shadow-primary/20">
                <Rocket className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900">
                ALI<span className="text-primary">CAFE</span> HELPER
            </h1>
          </div>
          <p className="text-neutral-500 font-medium max-w-lg mx-auto leading-relaxed">알리익스프레스 상품 포스팅을 위한 가장 스마트한 도구. 상품 정보를 자동으로 분석하고 카페 게시물 HTML을 생성합니다.</p>
        </header>

         <Card className="border-none shadow-xl bg-white overflow-hidden rounded-3xl">
            <CardHeader className="bg-neutral-900 text-white flex flex-row items-center justify-between py-6 px-8">
                <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        작업 대기 목록
                    </CardTitle>
                    <CardDescription className="text-neutral-400 mt-1">구글 시트에서 실시간으로 불러온 최신 상품들입니다.</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={fetchSheetData} disabled={isSheetLoading} className="text-white hover:bg-white/10 rounded-full h-12 w-12 transition-all">
                    <RefreshCw className={isSheetLoading ? 'animate-spin h-5 w-5' : 'h-5 w-5'} />
                </Button>
            </CardHeader>
            <CardContent className="p-8">
              {isSheetLoading ? (
                 <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-sm font-semibold text-neutral-400">시트 데이터를 불러오는 중...</p>
                 </div>
              ) : sheetData.length > 0 ? (
                <Carousel className="w-full">
                  <CarouselContent className="-ml-4">
                    {sheetData.map((item) => (
                      <CarouselItem key={item.rowNumber} className="pl-4 basis-full md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                        <div 
                            className={`group cursor-pointer p-6 border-2 rounded-2xl transition-all duration-300 h-full flex flex-col justify-between ${selectedRowNumber === item.rowNumber ? "border-primary bg-primary/[0.03] shadow-lg shadow-primary/5" : "border-neutral-100 bg-white hover:border-neutral-200 hover:shadow-md"}`}
                            onClick={() => {
                                setSelectedRowNumber(item.rowNumber);
                                form.setValue("Subject_title", item.상품명 || "");
                                form.setValue("productUrl", item.게시URL || "");
                                toast({ title: "상품 선택됨", description: item.상품명 });
                            }}
                        >
                          <div className="space-y-4">
                              <div className="flex justify-between items-start">
                                <Badge variant={selectedRowNumber === item.rowNumber ? "default" : "secondary"} className="px-3 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider">ROW {item.rowNumber}</Badge>
                                <span className="text-[10px] font-medium text-neutral-400">{item.Runtime ? new Date(item.Runtime).toLocaleDateString() : ''}</span>
                              </div>
                              <h3 className="font-bold text-sm leading-snug line-clamp-3 min-h-[4.5em] group-hover:text-primary transition-colors">{item.상품명}</h3>
                          </div>
                          <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-50">
                            <p className="text-[11px] font-bold text-neutral-400 uppercase">{item.사이트 || 'Aliexpress'}</p>
                            {item.게시URL && (
                                <a href={item.게시URL} target="_blank" rel="noopener noreferrer" className="p-2 bg-neutral-50 rounded-full text-neutral-400 hover:text-primary hover:bg-primary/10 transition-all" onClick={(e) => e.stopPropagation()}>
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            )}
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <div className="flex justify-center gap-3 mt-8">
                    <CarouselPrevious className="static translate-y-0 h-10 w-10 rounded-full shadow-sm hover:bg-neutral-900 hover:text-white transition-all border-none" />
                    <CarouselNext className="static translate-y-0 h-10 w-10 rounded-full shadow-sm hover:bg-neutral-900 hover:text-white transition-all border-none" />
                  </div>
                </Carousel>
              ) : (
                <div className="text-center py-20 bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-100">
                    <div className="bg-white p-4 rounded-full w-fit mx-auto shadow-sm mb-4">
                        <Tag className="h-8 w-8 text-neutral-300" />
                    </div>
                    <p className="text-neutral-500 font-medium">대기 중인 작업이 없습니다.</p>
                </div>
              )}
            </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-8">
                <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Tag className="h-5 w-5 text-primary" />
                            상품 정보 입력
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <Form {...form}>
                            <form className="space-y-6">
                                <FormField control={form.control} name="productUrl" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase text-neutral-400 tracking-wider">알리익스프레스 상품 URL</FormLabel>
                                        <FormControl><Input {...field} placeholder="https://aliexpress.com/item/..." className="bg-neutral-50 border-none h-14 rounded-2xl focus-visible:ring-primary/20 text-base" /></FormControl>
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="affShortKey" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase text-neutral-400 tracking-wider">제휴 단축 키 (Affiliate Key)</FormLabel>
                                        <FormControl><Input {...field} placeholder="단축 키 입력" className="bg-neutral-50 border-none h-14 rounded-2xl focus-visible:ring-primary/20" /></FormControl>
                                    </FormItem>
                                )} />

                                <Button type="button" onClick={handleGeneratePreview} className="w-full h-16 text-lg font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform active:scale-[0.99]" variant="default" disabled={isGeneratingPreview}>
                                    {isGeneratingPreview ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <Eye className="mr-3 h-6 w-6" />} 
                                    {isGeneratingPreview ? "상품 정보 분석 중..." : "상품 정보 분석 및 미리보기"}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {combinedInfo && (
                    <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-primary" />
                                할인 상세 정보
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8 pt-4">
                            <Form {...form}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="productPrice" render={({ field }) => (
                                        <FormItem className="col-span-full">
                                            <FormLabel className="text-xs font-bold uppercase text-neutral-400 tracking-wider">할인판매가</FormLabel>
                                            <FormControl><Input {...field} placeholder="예: $15.50 또는 21000" className="bg-neutral-50 border-none h-12 rounded-xl" /></FormControl>
                                        </FormItem>
                                    )} />

                                    <div className="space-y-3">
                                        <Label className="text-xs font-bold uppercase text-neutral-400 tracking-wider">코인할인</Label>
                                        <div className="flex gap-2">
                                            <Input 
                                                className="bg-neutral-50 border-none h-12 rounded-xl" 
                                                placeholder={coinDiscountType === 'rate' ? "할인율(%)" : "할인금액"}
                                                onChange={(e) => form.setValue("coinDiscountValue", e.target.value)}
                                            />
                                            <Button 
                                                type="button" 
                                                variant={coinDiscountType === 'rate' ? "default" : "outline"} 
                                                className="h-12 w-12 rounded-xl p-0" 
                                                onClick={() => setCoinDiscountType('rate')}
                                            ><Percent className="h-5 w-5" /></Button>
                                            <Button 
                                                type="button" 
                                                variant={coinDiscountType === 'amount' ? "default" : "outline"} 
                                                className="h-12 w-12 rounded-xl p-0" 
                                                onClick={() => setCoinDiscountType('amount')}
                                            ><DollarSign className="h-5 w-5" /></Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <FormField control={form.control} name="discountCode" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-neutral-400 tracking-wider">할인코드</FormLabel>
                                                <FormControl><Input {...field} placeholder="코드명" className="bg-neutral-50 border-none h-12 rounded-xl" /></FormControl>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="discountCodePrice" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-neutral-400 tracking-wider">코드 할인액</FormLabel>
                                                <FormControl><Input {...field} placeholder="금액" className="bg-neutral-50 border-none h-12 rounded-xl" /></FormControl>
                                            </FormItem>
                                        )} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <FormField control={form.control} name="storeCouponCode" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-neutral-400 tracking-wider">스토어쿠폰</FormLabel>
                                                <FormControl><Input {...field} placeholder="쿠폰명" className="bg-neutral-50 border-none h-12 rounded-xl" /></FormControl>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="storeCouponPrice" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-neutral-400 tracking-wider">쿠폰 할인액</FormLabel>
                                                <FormControl><Input {...field} placeholder="금액" className="bg-neutral-50 border-none h-12 rounded-xl" /></FormControl>
                                            </FormItem>
                                        )} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <FormField control={form.control} name="cardCompanyName" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-neutral-400 tracking-wider">카드사할인</FormLabel>
                                                <FormControl><Input {...field} placeholder="카드사명" className="bg-neutral-50 border-none h-12 rounded-xl" /></FormControl>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="cardPrice" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-neutral-400 tracking-wider">카드 할인액</FormLabel>
                                                <FormControl><Input {...field} placeholder="금액" className="bg-neutral-50 border-none h-12 rounded-xl" /></FormControl>
                                            </FormItem>
                                        )} />
                                    </div>
                                    
                                    <FormField control={form.control} name="productTag" render={({ field }) => (
                                        <FormItem className="col-span-full">
                                            <FormLabel className="text-xs font-bold uppercase text-neutral-400 tracking-wider">추가 태그 (해시태그)</FormLabel>
                                            <FormControl><Input {...field} placeholder="#알리익스프레스 #가성비템" className="bg-neutral-50 border-none h-12 rounded-xl" /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                            </Form>

                            <Separator className="bg-neutral-100" />

                            <div className="space-y-6">
                                <h4 className="text-sm font-bold flex items-center gap-2 text-neutral-900">
                                    <CreditCard className="h-4 w-4 text-primary" />
                                    구매자 리뷰 요약 (게시물 포함 여부)
                                </h4>
                                <div className="grid gap-3">
                                    {[combinedInfo.korean_summary1, combinedInfo.korean_summary2, combinedInfo.korean_summary3, combinedInfo.korean_summary4, combinedInfo.korean_summary5].filter(Boolean).map((review, i) => (
                                        <div key={i} className={`flex items-start gap-4 p-5 border-2 rounded-2xl transition-all duration-300 ${reviewSelections[i].included ? "border-primary/20 bg-primary/[0.02]" : "border-neutral-50 bg-neutral-50/50 opacity-60"}`}>
                                            <Checkbox 
                                                id={`review-${i}`} 
                                                checked={reviewSelections[i].included} 
                                                onCheckedChange={() => handleReviewSelectionChange(i)} 
                                                className="mt-1 h-5 w-5 rounded-md"
                                            />
                                            <label htmlFor={`review-${i}`} className="text-sm cursor-pointer font-medium leading-relaxed text-neutral-700">{review}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="lg:col-span-5 space-y-8">
                <Card className="border-none shadow-2xl rounded-3xl sticky top-8 overflow-hidden bg-white">
                    <CardHeader className="bg-primary text-white py-6 px-8">
                        <CardTitle className="text-xl font-bold flex items-center justify-between">
                            최종 게시물 미리보기
                            <Badge variant="secondary" className="bg-white/20 text-white border-none text-[10px] font-bold">PREVIEW</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="p-8">
                            <Form {...form}>
                                <FormField control={form.control} name="Subject_title" render={({ field }) => (
                                    <FormItem className="mb-8">
                                        <FormLabel className="text-xs font-bold uppercase text-neutral-400 tracking-wider">카페 게시물 제목</FormLabel>
                                        <FormControl><Input {...field} placeholder="카페에 게시될 제목" className="bg-neutral-50 border-none font-bold h-12 rounded-xl" /></FormControl>
                                    </FormItem>
                                )} />
                            </Form>
                            
                            <div className="border rounded-2xl bg-white p-6 h-[500px] overflow-auto shadow-inner text-sm leading-relaxed border-neutral-100">
                                {previewContent ? (
                                    <div dangerouslySetInnerHTML={{ __html: previewContent }} className="prose prose-neutral prose-sm max-w-none" />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-neutral-300 gap-4">
                                        <div className="bg-neutral-50 p-6 rounded-full">
                                            <Eye className="h-12 w-12 opacity-10" />
                                        </div>
                                        <p className="font-medium">상단에서 미리보기를 생성해주세요.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="px-8 pb-8">
                            <Button 
                                onClick={handlePostToNaverCafe} 
                                className="w-full h-20 text-2xl font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all disabled:grayscale" 
                                disabled={isLoading || !previewContent}
                            >
                                {isLoading ? <Loader2 className="animate-spin mr-3 h-8 w-8" /> : <Rocket className="mr-3 h-8 w-8" />} 
                                {isLoading ? "게시 중..." : "네이버 카페 게시하기"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
      <footer className="mt-24 text-center text-neutral-400 text-xs font-medium pb-10">
          © 2024 ALICAFE HELPER. 제휴 마케팅 자동화 도구.
      </footer>
    </main>
  );
}
