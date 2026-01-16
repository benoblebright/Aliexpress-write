
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Rocket, Trash2, ChevronDown, CheckCircle, XCircle, RefreshCw, ClipboardCopy, Eye, Code, Pilcrow, MessageSquareText, Download, Calculator, PanelLeft, PanelRight, Zap } from "lucide-react";

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
  type CarouselApi,
} from "@/components/ui/carousel";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";


const formSchema = z.object({
  Subject_title: z.string().optional(),
  productUrl: z.string().url({ message: "유효한 상품 URL을 입력해주세요." }),
  affShortKey: z.string().min(1, { message: "제휴 단축 키를 입력해주세요." }),
  productPrice: z.string().optional(),
  coinDiscountValue: z.string().optional(),
  productTag: z.string().optional(),
  discountCode: z.string().optional(),
  discountCodePrice: z
    .string()
    .optional(),
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

type CafePostStatus = 'idle' | 'success' | 'error' | 'loading';
interface CafePostResult {
    status: CafePostStatus;
    message: string;
}

interface ReviewSelection {
    included: boolean;
    summarized: boolean;
}

type CoinDiscountType = 'rate' | 'amount';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [cafePostResult, setCafePostResult] = useState<CafePostResult | null>(null);
  const [previewContent, setPreviewContent] = useState("");
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  
  const [isSheetLoading, setIsSheetLoading] = useState(true);
  const [sheetData, setSheetData] = useState<SheetData[]>([]);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [selectedRowNumber, setSelectedRowNumber] = useState<number | null>(null);

  const [combinedInfo, setCombinedInfo] = useState<CombinedInfo | null>(null);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [coinDiscountType, setCoinDiscountType] = useState<CoinDiscountType>('rate');

  const [reviewSelections, setReviewSelections] = useState<ReviewSelection[]>(
    Array(5).fill({ included: false, summarized: false })
  );
  
  const [calcA, setCalcA] = useState('');
  const [calcB, setCalcB] = useState('');
  const [calcC, setCalcC] = useState(0);
  const [calcD, setCalcD] = useState(0);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [pasteAndGoValue, setPasteAndGoValue] = useState('');
  const reviewCardRefs = useRef<(HTMLDivElement | null)[]>([]);


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

 const handlePasteAndGo = () => {
    if (!pasteAndGoValue) {
      toast({ variant: 'destructive', title: '입력 오류', description: '붙여넣을 데이터가 없습니다.' });
      return;
    }

    try {
      const wonPriceMatch = pasteAndGoValue.match(/₩([\d,]+)/);
      const dollarPriceMatch = pasteAndGoValue.match(/\$([\d,]+\.?\d*)/);

      if (wonPriceMatch && wonPriceMatch[1]) {
        const price = wonPriceMatch[1].replace(/,/g, '');
        form.setValue('productPrice', price);
      } else if (dollarPriceMatch && dollarPriceMatch[1]) {
        const price = dollarPriceMatch[1].replace(/,/g, '');
        form.setValue('productPrice', `$${price}`);
      }

      const urlMatch = pasteAndGoValue.match(/(https?:\/\/\S+)/);
      if (urlMatch) {
          const url = urlMatch[0];
          form.setValue('productUrl', url);
          
          const parts = pasteAndGoValue.split('|');
           if (parts.length > 1) {
                const titleAndUrlPart = parts[1].split('\n')[0].trim();
                const urlIndex = titleAndUrlPart.indexOf(url);
                const title = urlIndex !== -1 ? titleAndUrlPart.substring(0, urlIndex).trim() : titleAndUrlPart.trim();
                form.setValue('Subject_title', title);
           }
      } else {
          const parts = pasteAndGoValue.split('|');
          if (parts.length > 1) {
              const title = parts[1].split('\n')[0].trim();
              form.setValue('Subject_title', title);
          }
      }
      toast({ title: '성공', description: '데이터가 자동으로 입력되었습니다.' });
    } catch (e) {
        console.error("Paste and Go parsing error:", e);
        toast({ variant: 'destructive', title: '파싱 오류', description: '데이터를 분석하는 중 오류가 발생했습니다.' });
    }
  };
  
  const fetchSheetData = useCallback(async () => {
    setIsSheetLoading(true);
    setSheetError(null);
    try {
      const response = await fetch('/api/sheets');
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch sheet data');
      }
      setSheetData(result.data || []);
    } catch (error: any) {
      setSheetError(error.message);
      toast({
        variant: "destructive",
        title: "시트 데이터 로딩 오류",
        description: error.message,
      });
    } finally {
      setIsSheetLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSheetData();
  }, [fetchSheetData]);
  
  useEffect(() => {
    const numA = parseFloat(calcA) || 0;
    const numB = parseFloat(calcB) || 0;
    const sumC = numA + numB;
    setCalcC(sumC);
    if (sumC !== 0) {
      const percentageD = (numB / sumC) * 100;
      setCalcD(percentageD);
    } else {
      setCalcD(0);
    }
  }, [calcA, calcB]);
  
  const handleResetCalculator = () => {
    setCalcA('');
    setCalcB('');
  };

  const parsePrice = (price: string | number | undefined | null): number => {
      if (price === undefined || price === null || price === '') return 0;
      if (typeof price === 'number') return price;
      const parsed = parseFloat(String(price).replace(/[^0-9.-]+/g, ''));
      return isNaN(parsed) ? 0 : parsed;
  };

  const generateHtmlContent = useCallback((info: CombinedInfo | null, selections: ReviewSelection[], currentCoinDiscountType: CoinDiscountType): string => {
    if (!info?.product_title || !info?.final_url) {
        return "<p>조회된 상품 정보가 올바르지 않습니다.</p>";
    }

    const { ...product } = form.getValues();
    
    const isDollar = (originalInput?: string, price?: number): boolean => {
      if (originalInput && originalInput.includes('$')) return true;
      if (price !== undefined && price < 1000) return true;
      return false;
    }
    
    const formatPrice = (price: number, originalInput?: string): string => {
        if (isDollar(originalInput, price)) {
            return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return new Intl.NumberFormat('ko-KR').format(Math.floor(price)) + '원';
    };

    let content = `<p>${info.product_title}</p><br />`;

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
      const isPriceInDollar = isDollar(product.productPrice, productPriceNum);
      if (currentCoinDiscountType === 'rate') {
        let coinDiscountValue;
        if (isPriceInDollar) {
            coinDiscountValue = Math.round((productPriceNum * (coinDiscountNum / 100)) * 100) / 100;
        } else {
            coinDiscountValue = Math.floor(productPriceNum * (coinDiscountNum / 100));
        }
        content += `<p>코인할인 ( ${coinDiscountNum}% )</p>`;
        finalPrice -= coinDiscountValue;
      } else { // amount
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
        content += `<br /><p>할인구매가: ${formatPrice(Math.max(0, finalPrice), product.productPrice)}</p>`;
    }
    
    content += `<br /><p>할인상품 : <a href='${info.final_url}'>특가상품 바로가기</a></p><br />`;
    
    const saleVolume = info.sale_volume || 0;
    const totalNum = info.total_num || 0;
    const koreanLocalCount = info.korean_local_count || 0;

    if (saleVolume > 0 || totalNum > 0 || koreanLocalCount > 0) {
      content += `<p>리뷰 요약: 총판매 ${saleVolume}개, 총리뷰 ${totalNum}개, 국내리뷰 ${koreanLocalCount}개</p><br />`;
    }

    const reviewsToAdd = [
        info.korean_summary1,
        info.korean_summary2,
        info.korean_summary3,
        info.korean_summary4,
        info.korean_summary5,
    ]
    .map((review, index) => ({ review, selection: selections[index] }))
    .filter(({ review, selection }) => review && selection.included)
    .map(({ review, selection }) => {
        let reviewContent = review!.replace(/<[^>]*>?/gm, ''); // Basic HTML tag removal
        if (selection.summarized && reviewContent.length > 50) {
            reviewContent = `<p>- ${reviewContent.substring(0, 50)}... <a href='${info.final_url}'>더보기</a></p>`;
        } else {
            reviewContent = `<p>- ${reviewContent}</p>`;
        }
        return reviewContent;
    })
    .join('<br />');

    if(reviewsToAdd) {
        content += reviewsToAdd + '<br />';
    }

    if (product.productTag) {
        const tags = product.productTag.split(' ').map(tag => tag.trim()).filter(tag => tag).map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
        if (tags) {
            content += `<p>${tags}</p>`;
        }
    }
    
    return content;
  }, [form]);
  
  const handleGeneratePreview = async () => {
    const { productUrl, affShortKey } = form.getValues();
    const isFormValid = await form.trigger(["productUrl", "affShortKey"]);

    if (!isFormValid) {
        toast({ variant: "destructive", title: "입력 오류", description: "상품 URL과 제휴 단축 키를 올바르게 입력해주세요." });
        return;
    }

    setIsGeneratingPreview(true);
    setCombinedInfo(null);
    setPreviewContent("");
    setReviewSelections(Array(5).fill({ included: false, summarized: false }));
    setIsHtmlMode(false);

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
        
        if (!infoResponse.ok) {
            const errorMessage = infoResult.error || '상품 정보를 가져오는 중 알 수 없는 오류가 발생했습니다.';
            toast({
                variant: "destructive",
                title: "상품 정보 API 오류",
                description: `오류: ${errorMessage}`,
            });
            throw new Error(`상품 정보 API 오류: ${errorMessage}`);
        }

        if (!infoResult.allInfos || infoResult.allInfos.length === 0) {
             throw new Error('API에서 상품 정보를 반환하지 않았습니다.');
        }
        
        if (!reviewsResponse.ok) {
            const errorMessage = reviewsResult.error || '리뷰 정보를 가져오는 중 알 수 없는 오류가 발생했습니다.';
             toast({
                variant: "destructive",
                title: "리뷰 정보 로딩 실패",
                description: errorMessage,
            });
        }

        const productInfo = infoResult.allInfos[0];
        
        const reviewData = (Array.isArray(reviewsResult) && reviewsResult.length > 0) ? reviewsResult[0] : null;

        const koreanReviews = (reviewData?.korean_summary || '').split('|').map((s: string) => s.trim()).filter(Boolean);

        const newCombinedInfo: CombinedInfo = {
            original_url: productInfo.original_url,
            final_url: productInfo.final_url,
            kakao_urls: (productInfo.kakao_urls && Array.isArray(productInfo.kakao_urls)) ? productInfo.kakao_urls : [],
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
        
    } catch (e: any) {
        const errorMessage = `미리보기 생성 오류: ${e.message}`;
        toast({ variant: "destructive", title: "미리보기 생성 오류", description: e.message });
        setPreviewContent(`<p>${errorMessage}</p>`);
    } finally {
      setIsGeneratingPreview(false);
    }
};


  const handlePostToNaverCafe = async () => {
    if (!combinedInfo || !previewContent) {
      toast({ variant: "destructive", title: "게시 불가", description: "먼저 미리보기를 생성해주세요." });
      return;
    }
  
    setIsLoading(true);
    setCafePostResult({ status: 'loading', message: '네이버 카페에 글을 게시하는 중...' });
  
    const product = form.getValues();
    const isDollar = (originalInput?: string, price?: number): boolean => {
      if (originalInput && originalInput.includes('$')) return true;
      if (price !== undefined && price < 1000) return true;
      return false;
    }
    const productPriceNum = parsePrice(product.productPrice);
    const coinDiscountNum = parsePrice(product.coinDiscountValue);
    const discountCodePriceNum = parsePrice(product.discountCodePrice);
    const storeCouponPriceNum = parsePrice(product.storeCouponPrice);
    const cardPriceNum = parsePrice(product.cardPrice);

    let finalPriceForRate = productPriceNum;
    if (coinDiscountNum > 0 && productPriceNum > 0) {
      const isPriceInDollar = isDollar(product.productPrice, productPriceNum);
      if (coinDiscountType === 'rate') {
          let coinDiscountValue;
          if (isPriceInDollar) {
              coinDiscountValue = Math.round((productPriceNum * (coinDiscountNum / 100)) * 100) / 100;
          } else {
              coinDiscountValue = Math.floor(productPriceNum * (coinDiscountNum / 100));
          }
          finalPriceForRate -= coinDiscountValue;
      } else {
          finalPriceForRate -= coinDiscountNum;
      }
    }
    if (discountCodePriceNum > 0) finalPriceForRate -= discountCodePriceNum;
    if (storeCouponPriceNum > 0) finalPriceForRate -= storeCouponPriceNum;
    if (cardPriceNum > 0) finalPriceForRate -= cardPriceNum;
    finalPriceForRate = Math.max(0, finalPriceForRate);

    const discountRate = productPriceNum > 0 ? ((productPriceNum - finalPriceForRate) / productPriceNum) * 100 : 0;
    const originalTitle = form.getValues("Subject_title") || combinedInfo.product_title;
    const finalSubject = discountRate > 0 ? `(${Math.floor(discountRate)}%) ${originalTitle}` : originalTitle;

    const cafePayload = {
      subject: finalSubject,
      content: previewContent,
      image_urls: combinedInfo.product_main_image_url ? [combinedInfo.product_main_image_url] : [],
      club_id: "31609361",
      menu_id: "2"
    };

    console.log("네이버 카페 전송 데이터:", cafePayload);

     if (combinedInfo.kakao_urls && combinedInfo.kakao_urls.length > 0) {
        const formatKakaoPrice = (price: number, originalInput?: string): string => {
            if (isDollar(originalInput, price)) {
                return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
            return new Intl.NumberFormat('ko-KR').format(Math.floor(price)) + '원';
        };

        let finalPrice = productPriceNum;
        let kakaoContent = `상품명 : ${product.Subject_title || combinedInfo.product_title}\n`;
        if (productPriceNum > 0) kakaoContent += `할인판매가 : ${formatKakaoPrice(productPriceNum, product.productPrice)}\n`;

        if (coinDiscountNum > 0 && productPriceNum > 0) {
            const isPriceInDollar = isDollar(product.productPrice, productPriceNum);
            if (coinDiscountType === 'rate') {
                let coinDiscountValue;
                if (isPriceInDollar) {
                    coinDiscountValue = Math.round((productPriceNum * (coinDiscountNum / 100)) * 100) / 100;
                } else {
                    coinDiscountValue = Math.floor(productPriceNum * (coinDiscountNum / 100));
                }
                finalPrice -= coinDiscountValue;
                kakaoContent += `코인할인율 : ${coinDiscountNum}%\n`;
            } else {
                finalPrice -= coinDiscountNum;
                kakaoContent += `코인할인 : -${formatKakaoPrice(coinDiscountNum, product.coinDiscountValue)}\n`;
            }
        }
        if (discountCodePriceNum > 0 && product.discountCode) {
            finalPrice -= discountCodePriceNum;
            kakaoContent += `할인코드 : -${formatKakaoPrice(discountCodePriceNum, product.discountCodePrice)} (${product.discountCode})\n`;
        }
        if (storeCouponPriceNum > 0 && product.storeCouponCode) {
            finalPrice -= storeCouponPriceNum;
            kakaoContent += `스토어쿠폰 : -${formatKakaoPrice(storeCouponPriceNum, product.storeCouponPrice)} (${product.storeCouponCode})\n`;
        }
        if (cardPriceNum > 0 && product.cardCompanyName) {
            finalPrice -= cardPriceNum;
            kakaoContent += `카드할인 : -${formatKakaoPrice(cardPriceNum, product.cardPrice)} (${product.cardCompanyName})\n`;
        }
        finalPrice = Math.max(0, finalPrice);
        const totalDiscountRate = productPriceNum > 0 ? ((productPriceNum - finalPrice) / productPriceNum) * 100 : 0;
        
        if (finalPrice < productPriceNum && productPriceNum > 0) {
            kakaoContent += `할인구매가 : ${formatKakaoPrice(finalPrice, product.productPrice)} (${Math.floor(totalDiscountRate)}%)`;
        }

        const kakaoPayload = {
            kakao_content: kakaoContent,
            kakao_url: combinedInfo.kakao_urls[0],
        };

        console.log("카카오 전송 데이터:", kakaoPayload);

        // 비동기 호출, 결과 기다리지 않음
        fetch("/api/post-to-kakao", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(kakaoPayload),
        }).then(response => {
            if (!response.ok) {
                console.error("카카오톡 전송 API 호출 실패");
            } else {
                console.log("카카오톡 전송 API 호출 성공");
            }
        }).catch(error => {
            console.error("카카오톡 전송 중 오류 발생:", error);
        });
    }
  
    try {
      const cafeResponse = await fetch("/api/post-to-naver-cafe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cafePayload),
      });
  
      const result = await cafeResponse.json();

      if (cafeResponse.ok && result.url) {
          const articleUrl = result.url;
          setCafePostResult({ status: 'success', message: `상품이 네이버 카페에 성공적으로 게시되었습니다. URL: ${articleUrl}` });
          toast({
              title: "성공!",
              description: `상품이 네이버 카페에 성공적으로 게시되었습니다.`,
          });
          
          try {
              let finalPrice = productPriceNum;
              if (coinDiscountNum > 0 && productPriceNum > 0) {
                const isPriceInDollar = isDollar(product.productPrice, productPriceNum);
                if (coinDiscountType === 'rate') {
                    let coinDiscountValue;
                    if (isPriceInDollar) {
                        coinDiscountValue = Math.round((productPriceNum * (coinDiscountNum / 100)) * 100) / 100;
                    } else {
                        coinDiscountValue = Math.floor(productPriceNum * (coinDiscountNum / 100));
                    }
                    finalPrice -= coinDiscountValue;
                } else {
                    finalPrice -= coinDiscountNum;
                }
              }
              if (discountCodePriceNum > 0) finalPrice -= discountCodePriceNum;
              if (storeCouponPriceNum > 0) finalPrice -= storeCouponPriceNum;
              if (cardPriceNum > 0) finalPrice -= cardPriceNum;
              finalPrice = Math.max(0, finalPrice);
  
              const sheetDiscountRate = productPriceNum > 0 ? ((productPriceNum - finalPrice) / productPriceNum) * 100 : 0;
  
              const allReviews = [
                  combinedInfo.korean_summary1,
                  combinedInfo.korean_summary2,
                  combinedInfo.korean_summary3,
                  combinedInfo.korean_summary4,
                  combinedInfo.korean_summary5,
              ];
              const selectedReviewTexts = allReviews
                .filter((review, index) => review && reviewSelections[index].included);

              const firstSelectedReview = selectedReviewTexts[0] || '';
              const allSelectedReviews = selectedReviewTexts.join(' | ');

              const formatSheetPrice = (priceNum: number, originalInput?: string): string => {
                  if (!originalInput && priceNum === 0) return '';
                  if (isDollar(originalInput, priceNum)) {
                      return '$' + priceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  }
                  return new Intl.NumberFormat('ko-KR').format(Math.floor(priceNum)) + '원';
              };
              
              let coinDiscountSheetValue = '';
                if (product.coinDiscountValue) {
                    if (coinDiscountType === 'rate') {
                        coinDiscountSheetValue = `${product.coinDiscountValue}%`;
                    } else {
                        coinDiscountSheetValue = formatSheetPrice(coinDiscountNum, product.coinDiscountValue);
                    }
                }

              const newValues: { [key: string]: any } = {
                  "글쓰기 시간": new Date().toISOString(),
                  'Subject_title': form.getValues("Subject_title") || '',
                  'full_product_name': combinedInfo.product_title || '',
                  '할인판매가': formatSheetPrice(productPriceNum, product.productPrice),
                  '할인구매가': formatSheetPrice(finalPrice, product.productPrice),
                  '이미지URL': combinedInfo.product_main_image_url || '',
                  '총판매': combinedInfo.sale_volume,
                  '총리뷰': combinedInfo.total_num,
                  '국내리뷰': combinedInfo.korean_local_count,
                  '고객리뷰요약': combinedInfo.korean_summary || '',
                  '할인율': `${Math.floor(sheetDiscountRate)}%`,
                  '게시물URL': articleUrl,
                  'af_link': combinedInfo.final_url || '',
                  'kakao_urls': combinedInfo.kakao_urls.join(', ') || '',
                  'review_all': allSelectedReviews || '',
                  '고객리뷰': firstSelectedReview,
                  '코인할인': coinDiscountSheetValue,
                  '할인코드': product.discountCode || '',
                  '할인코드 할인가': formatSheetPrice(discountCodePriceNum, product.discountCodePrice),
                  '스토어쿠폰 코드': product.storeCouponCode || '',
                  '스토어쿠폰 코드 할인가': formatSheetPrice(storeCouponPriceNum, product.storeCouponPrice),
                  '카드사명': product.cardCompanyName || '',
                  '카드할인가': formatSheetPrice(cardPriceNum, product.cardPrice),
                  '상품태그': product.productTag || '',
              };

              // 'data' 시트에서 해당 항목을 'checkup: 1'로 업데이트
              if (selectedRowNumber !== null) {
                  await fetch('/api/sheets', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          rowNumber: selectedRowNumber,
                          newValues: { checkup: '1' }
                      }),
                  });
              }

              // 'sns_upload' 시트에 새 행으로 데이터 추가
              await fetch('/api/sheets', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      sheetName: 'sns_upload',
                      newValues
                  }),
              });
  
              // Reset state for next operation
              if(selectedRowNumber !== null) {
                setSheetData(prev => prev.filter(d => d.rowNumber !== selectedRowNumber));
              }
              setSelectedRowNumber(null);
              form.reset();
              setCombinedInfo(null);
              setPreviewContent("");
              handleResetCalculator();
              setReviewSelections(Array(5).fill({ included: false, summarized: false }));
              setPasteAndGoValue('');
  
          } catch (sheetError) {
              console.error("Failed to update sheet after posting:", sheetError);
              toast({
                  variant: "destructive",
                  title: "시트 업데이트 실패",
                  description: "네이버 카페 글쓰기는 성공했으나, 시트 상태를 업데이트하는 데 실패했습니다. 새로고침 후 확인해주세요.",
              });
          }
      } else {
          const cafeErrorMessage = result.error?.message || result.error || `게시물 URL을 찾을 수 없습니다. 응답: ${JSON.stringify(result)}`;
          throw new Error(`네이버 카페 게시 실패: ${cafeErrorMessage}`);
      }
    } catch (error: any) {
        setCafePostResult({ status: 'error', message: error.message || "알 수 없는 오류가 발생했습니다." });
        toast({
            variant: "destructive",
            title: "오류 발생",
            description: error.message || "네이버 카페 글쓰기 중 오류가 발생했습니다.",
        });
    } finally {
        setIsLoading(false);
    }
};

  const handleDeleteSheetRow = async (rowNumber: number) => {
    const originalData = [...sheetData];
    setSheetData(prevData => prevData.filter(item => item.rowNumber !== rowNumber));
    if (selectedRowNumber === rowNumber) {
        setSelectedRowNumber(null);
        form.reset();
        setCombinedInfo(null);
        setPreviewContent("");
    }

    try {
        const response = await fetch('/api/sheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rowNumber, newValues: { checkup: '1' } }),
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.error || 'Failed to delete row');
        }
        toast({ title: "성공", description: `항목(Row: ${rowNumber})이 삭제처리 되었습니다.` });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "삭제 실패",
            description: `항목(Row: ${rowNumber}) 삭제 중 오류 발생: ${error.message}`,
        });
        setSheetData(originalData);
    }
  };

  const handleSelectSheetItem = (item: SheetData) => {
    if (selectedRowNumber === item.rowNumber) {
        setSelectedRowNumber(null);
        form.reset();
        setCombinedInfo(null);
        setPreviewContent("");
        setReviewSelections(Array(5).fill({ included: false, summarized: false }));
        setPasteAndGoValue('');
    } 
    else {
        setSelectedRowNumber(item.rowNumber);
        form.setValue("Subject_title", item.상품명 || "");
    }
  };

  const handleImageDownload = async () => {
    if (!combinedInfo?.product_main_image_url) {
      toast({ variant: "destructive", title: "다운로드 실패", description: "이미지 URL이 없습니다." });
      return;
    }
    try {
      const response = await fetch(combinedInfo.product_main_image_url);
      if (!response.ok) {
        throw new Error('Image fetch failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = combinedInfo.product_main_image_url.split('/').pop()?.split('?')[0] || 'download.jpg';
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({ title: "성공", description: "이미지 다운로드를 시작합니다." });
    } catch (error) {
      console.error("Image download failed:", error);
      toast({ variant: "destructive", title: "다운로드 실패", description: "이미지를 다운로드하는 중 오류가 발생했습니다." });
    }
  };


  const handleReviewSelectionChange = (index: number, type: 'included' | 'summarized') => {
    const cardRef = reviewCardRefs.current[index];
    
    setReviewSelections(prev => {
        const newSelections = [...prev];
        const currentSelection = { ...newSelections[index] };

        if (type === 'included') {
            currentSelection.included = !currentSelection.included;
            if (!currentSelection.included) {
                currentSelection.summarized = false;
            }
        } else if (type === 'summarized') {
            if (currentSelection.included) {
                currentSelection.summarized = !currentSelection.summarized;
            }
        }
        
        newSelections[index] = currentSelection;
        return newSelections;
    });

    if (cardRef) {
        cardRef.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
};
  
  const handleCopyHtml = () => {
    if (!previewContent) {
      toast({
        variant: "destructive",
        title: "복사 실패",
        description: "복사할 HTML 내용이 없습니다.",
      });
      return;
    }
    navigator.clipboard.writeText(previewContent);
    toast({
      title: "복사 완료",
      description: "HTML 소스가 클립보드에 복사되었습니다.",
    });
  };

  const formFields = {
    required: [
        { name: "Subject_title", label: "제목", placeholder: "작업 대기 목록에서 선택하거나 직접 입력", isRequired: false },
        { name: "productUrl", label: "알리익스프레스 상품 URL", placeholder: "https://www.aliexpress.com/...", isRequired: true },
        { name: "affShortKey", label: "제휴 단축 키", placeholder: "예: _onQoGf7", isRequired: true },
        { name: "productPrice", label: "상품판매가", placeholder: "예: 25 또는 30000원 또는 $25", isRequired: false },
        { name: "coinDiscountValue", label: "코인할인", placeholder: coinDiscountType === 'rate' ? "예: 10" : "예: 2000", isRequired: false },
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
  
  const getAlertVariant = (status: CafePostStatus): "default" | "destructive" => {
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

  const reviews = combinedInfo ? [
    combinedInfo.korean_summary1,
    combinedInfo.korean_summary2,
    combinedInfo.korean_summary3,
    combinedInfo.korean_summary4,
    combinedInfo.korean_summary5,
  ].filter(Boolean) : [];

  useEffect(() => {
    if (selectedRowNumber === null) {
      form.reset();
      handleResetCalculator();
      setPasteAndGoValue('');
    } else {
        const selectedItem = sheetData.find(item => item.rowNumber === selectedRowNumber);
        if (selectedItem) {
            form.setValue("Subject_title", selectedItem.상품명 || "");
        }
    }
  }, [selectedRowNumber, form, sheetData]);
  
  useEffect(() => {
    if(combinedInfo) {
      const content = generateHtmlContent(combinedInfo, reviewSelections, coinDiscountType);
      setPreviewContent(content);
    }
  }, [reviewSelections, combinedInfo, generateHtmlContent, coinDiscountType]);

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-primary flex items-center justify-center gap-3">
            <Rocket className="h-10 w-10" />
            Aliexpress 네이버 카페 글쓰기
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            상품 정보를 입력하고 네이버 카페에 바로 글을 게시하세요.
          </p>
        </header>

         <Card className="shadow-lg mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle>작업 대기 목록</CardTitle>
                    <CardDescription>
                    구글 시트에서 가져온 작업 목록입니다.
                    </CardDescription>
                </div>
                <Button variant="outline" size="icon" onClick={fetchSheetData} disabled={isSheetLoading}>
                    <RefreshCw className={`h-4 w-4 ${isSheetLoading ? 'animate-spin' : ''}`} />
                    <span className="sr-only">새로고침</span>
                </Button>
            </CardHeader>
            <CardContent>
              {isSheetLoading ? (
                 <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
              ) : sheetError ? (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>오류</AlertTitle>
                  <AlertDescription>{sheetError}</AlertDescription>
                </Alert>
              ) : sheetData.length === 0 ? (
                 <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>완료</AlertTitle>
                    <AlertDescription>대기중인 작업 목록이 없습니다.</AlertDescription>
                 </Alert>
              ) : (
                <Carousel setApi={setCarouselApi} className="w-full">
                  <CarouselContent>
                    {sheetData.map((item) => (
                      <CarouselItem key={item.rowNumber}>
                        <div className="p-1">
                          <Card className={selectedRowNumber === item.rowNumber ? "border-primary" : ""}>
                            <CardHeader>
                              <CardTitle className="truncate text-lg">{item.상품명 || "상품명 없음"}</CardTitle>
                              <CardDescription>{item.사이트 || "사이트 정보 없음"}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-2xl font-bold text-primary">{item.게시가격 || "가격 정보 없음"}</p>
                                {item.Runtime && (
                                    <p className="text-xs text-muted-foreground">
                                        확인일시: {new Date(item.Runtime).toLocaleString('ko-KR')}
                                    </p>
                                )}
                                <div className="grid grid-cols-1 gap-2">
                                     <Button asChild variant="outline" className="w-full">
                                        <a href={item.게시URL} target="_blank" rel="noopener noreferrer">URL 가서 확인하기</a>
                                    </Button>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-2 gap-2">
                                    <Button 
                                        onClick={() => handleSelectSheetItem(item)}
                                        variant={selectedRowNumber === item.rowNumber ? "default" : "outline"}
                                        className="w-full"
                                    >
                                        <CheckCircle className={`mr-2 h-4 w-4 ${selectedRowNumber !== item.rowNumber && 'hidden'}`} />
                                        {selectedRowNumber === item.rowNumber ? "선택 해제" : "작업 선택"}
                                    </Button>
                                    <Button onClick={() => handleDeleteSheetRow(item.rowNumber)} variant="destructive" className="w-full">
                                        <Trash2 className="mr-2 h-4 w-4"/>
                                        삭제
                                    </Button>
                                </div>
                            </CardContent>
                          </Card>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="flex" />
                  <CarouselNext className="flex" />
                </Carousel>
              )}
            </CardContent>
        </Card>
        
        <Collapsible
            open={isCalculatorOpen}
            onOpenChange={setIsCalculatorOpen}
            className="mb-8"
        >
            <Card className="shadow-lg">
                <CollapsibleTrigger asChild>
                    <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
                        <div className="space-y-1.5">
                            <CardTitle className="flex items-center gap-2">
                                <Calculator className="h-6 w-6" />
                                계산기
                            </CardTitle>
                            <CardDescription>간단한 계산을 수행합니다.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); handleResetCalculator(); }}>
                                <RefreshCw className="h-4 w-4" />
                                <span className="sr-only">계산기 초기화</span>
                            </Button>
                             <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isCalculatorOpen ? 'rotate-180' : ''}`} />
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="calcA">값 A</Label>
                                <Input id="calcA" type="number" placeholder="A 값을 입력하세요" value={calcA} onChange={(e) => setCalcA(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="calcB">값 B</Label>
                                <Input id="calcB" type="number" placeholder="B 값을 입력하세요" value={calcB} onChange={(e) => setCalcB(e.target.value)} />
                            </div>
                        </div>
                        <Separator className="my-4" />
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-4 bg-muted/50 rounded-lg">
                                <p className="text-sm font-medium text-muted-foreground">C = A + B</p>
                                <p className="text-2xl font-bold text-primary">{calcC.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg">
                                <p className="text-sm font-medium text-muted-foreground">D = (B / C * 100)%</p>
                                <p className="text-2xl font-bold text-primary">{calcD.toFixed(2)}%</p>
                            </div>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>


        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>정보 입력</CardTitle>
            <CardDescription>
              글을 쓸 상품의 URL과 제휴 키, 할인 정보를 입력해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handlePostToNaverCafe)}
                className="space-y-8"
              >
                <div className="space-y-4 rounded-lg border p-4">
                    <CardTitle className="text-xl mb-4">URL 복사붙여넣기</CardTitle>
                    <div className="space-y-2">
                        <Label htmlFor="paste-and-go">데이터 붙여넣기</Label>
                        <div className="flex gap-2">
                          <Input 
                              id="paste-and-go" 
                              placeholder="...|제목|https://..."
                              value={pasteAndGoValue} 
                              onChange={(e) => setPasteAndGoValue(e.target.value)}
                          />
                          <Button type="button" onClick={handlePasteAndGo}>
                            <Zap className="mr-2 h-4 w-4" />
                            적용하기
                          </Button>
                        </div>
                         <p className="text-xs text-muted-foreground">
                            붙여넣기 후 '적용하기'를 누르면 가격, 제목, URL이 자동 입력됩니다.
                        </p>
                    </div>
                </div>

                <div className="space-y-4 rounded-lg border p-4">
                    <CardTitle className="text-xl mb-4">필수 정보</CardTitle>
                    {formFields.required.map((fieldInfo) => (
                      <FormField
                        key={fieldInfo.name}
                        control={form.control}
                        name={fieldInfo.name as keyof FormData}
                        render={({ field }) => (
                          <FormItem>
                             <FormLabel>
                                {fieldInfo.label}
                                {fieldInfo.isRequired && <span className="text-destructive"> *</span>}
                            </FormLabel>
                             {fieldInfo.name === 'affShortKey' && (
                                <div className="flex gap-2 pt-2 pb-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => form.setValue('affShortKey', '_c2R7VbXB')}>
                                    엄마
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => form.setValue('affShortKey', '_c3Xja9WB')}>
                                    상희
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => form.setValue('affShortKey', '_Dcj12VJ')}>
                                    지희
                                </Button>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                              {fieldInfo.name === 'coinDiscountValue' ? (
                                <>
                                  <Button 
                                      type="button" 
                                      variant="outline" 
                                      onClick={() => setCoinDiscountType(prev => prev === 'rate' ? 'amount' : 'rate')}
                                      className="w-16 flex-shrink-0"
                                  >
                                      {coinDiscountType === 'rate' ? '%' : '액'}
                                  </Button>
                                  <FormControl className="flex-grow">
                                    <Input
                                      placeholder={fieldInfo.placeholder}
                                      {...field}
                                      value={field.value ?? ""}
                                    />
                                  </FormControl>
                                </>
                              ) : (
                                <FormControl>
                                  <Input
                                    placeholder={fieldInfo.placeholder}
                                    {...field}
                                    value={field.value ?? ""}
                                  />
                                </FormControl>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                      <Collapsible>
                          <CollapsibleTrigger asChild>
                              <Button type="button" variant="outline" className="w-full">
                                  <ChevronDown className="h-4 w-4 mr-2" />
                                  추가 할인 정보 입력 (선택)
                              </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-4 pt-4">
                              {formFields.collapsible.map((fieldInfo) => (
                                  <FormField
                                  key={fieldInfo.name}
                                  control={form.control}
                                  name={fieldInfo.name as keyof FormData}
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
                      <Button
                        type="button"
                        onClick={handleGeneratePreview}
                        className="w-full mt-4"
                        disabled={isGeneratingPreview}
                      >
                        {isGeneratingPreview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                        미리보기 생성
                      </Button>
                </div>
                
                {combinedInfo && (
                  <div>
                    <Separator className="my-8" />
                    <div className="space-y-6">
                        <div className="space-y-4 rounded-lg border p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <CardTitle className="text-xl">미리보기</CardTitle>
                                <div className="flex flex-wrap gap-2 justify-end">
                                    <Button type="button" variant="outline" size="sm" onClick={() => setIsHtmlMode(!isHtmlMode)} disabled={!previewContent}>
                                        {isHtmlMode ? <Pilcrow className="mr-2 h-4 w-4" /> : <Code className="mr-2 h-4 w-4" />}
                                        {isHtmlMode ? "미리보기" : "HTML 보기"}
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" onClick={handleCopyHtml} disabled={!previewContent}>
                                        <ClipboardCopy className="mr-2 h-4 w-4" />
                                        HTML 복사
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" onClick={handleImageDownload} disabled={!combinedInfo?.product_main_image_url}>
                                        <Download className="mr-2 h-4 w-4" />
                                        이미지 다운로드
                                    </Button>
                                </div>
                            </div>
                          
                          {isGeneratingPreview ? (
                             <div className="flex items-center justify-center h-96">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                             </div>
                          ) : previewContent && (
                            <>
                              {isHtmlMode ? (
                                 <Textarea
                                    id="preview-html"
                                    placeholder="HTML 소스..."
                                    value={previewContent}
                                    onChange={(e) => setPreviewContent(e.target.value)}
                                    className="h-96 text-sm font-mono bg-muted/30"
                                  />
                              ) : (
                                 <div
                                    id="preview-display"
                                    className="h-96 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background prose prose-sm max-w-none overflow-y-auto"
                                    dangerouslySetInnerHTML={{ __html: previewContent }}
                                 />
                              )}
                            </>
                          )}

                        </div>
                        
                        {reviews.length > 0 && (
                           <div className="rounded-lg border p-4">
                                <CardTitle className="text-xl mb-2">AI 리뷰 선택</CardTitle>
                                 <Carousel className="w-full relative px-8">
                                    <CarouselContent>
                                        {reviews.map((review, index) => (
                                            <CarouselItem key={index}>
                                                <div 
                                                    className="p-1" 
                                                    ref={el => reviewCardRefs.current[index] = el}
                                                >
                                                    <div className="flex flex-col gap-3 p-4 rounded-md border bg-muted/40 h-full">
                                                        <ScrollArea className="flex-grow h-32">
                                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                                {review as string}
                                                            </p>
                                                        </ScrollArea>
                                                        <Separator />
                                                        <div className="flex items-center justify-end gap-4 pt-2">
                                                            <div className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id={`include-review-${index}`}
                                                                    checked={reviewSelections[index].included}
                                                                    onCheckedChange={() => handleReviewSelectionChange(index, 'included')}
                                                                />
                                                                <label htmlFor={`include-review-${index}`} className="text-xs font-medium leading-none cursor-pointer">
                                                                    포함
                                                                </label>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id={`summarize-review-${index}`}
                                                                    checked={reviewSelections[index].summarized}
                                                                    onCheckedChange={() => handleReviewSelectionChange(index, 'summarized')}
                                                                    disabled={!reviewSelections[index].included}
                                                                />
                                                                <label htmlFor={`summarize-review-${index}`} className="text-xs font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                                    줄임
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    <CarouselPrevious className="flex -left-2 z-10" />
                                    <CarouselNext className="flex -right-2 z-10" />
                                </Carousel>
                            </div>
                        )}
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full text-lg py-6"
                  disabled={isLoading || !previewContent}
                >
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Rocket className="mr-2 h-5 w-5" />}
                  {isLoading ? "게시 중..." : "네이버 카페 글쓰기"}
                </Button>

                {cafePostResult && cafePostResult.status !== 'idle' && (
                  <Alert variant={getAlertVariant(cafePostResult.status)}>
                    <AlertTitle>
                      {cafePostResult.status === 'loading' && '처리 중'}
                      {cafePostResult.status === 'success' && '성공'}
                      {cafePostResult.status === 'error' && '오류'}
                    </AlertTitle>
                    <AlertDescription>
                      <p className="whitespace-pre-wrap font-sans mb-4">{cafePostResult.message}</p>
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

    