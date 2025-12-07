
"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Rocket, Trash2, ChevronDown, CheckCircle, XCircle, RefreshCw, ClipboardCopy, Eye, Code, ImagePlus, Pilcrow, MessageSquareText, FileJson } from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";


const formSchema = z.object({
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
});

type FormData = z.infer<typeof formSchema>;

interface SheetData {
  rowNumber: number;
  상품명?: string;
  사이트?: string;
  가격?: string;
  URL?: string;
  Runtime?: string;
  [key: string]: any;
}

interface AllInfo {
    product_main_image_url: string;
    product_title: string;
    final_url: string;
    original_url: string;
    sale_volume?: string | number;
    korean_summary?: string;
    korean_local_count?: number;
    total_num?: number;
    reviewImageUrls?: string[];
}

type BandPostStatus = 'idle' | 'success' | 'error' | 'loading';
interface BandPostResult {
    status: BandPostStatus;
    message: string;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [bandPostResult, setBandPostResult] = useState<BandPostResult | null>(null);
  const [previewContent, setPreviewContent] = useState("");
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  
  const [isSheetLoading, setIsSheetLoading] = useState(true);
  const [sheetData, setSheetData] = useState<SheetData[]>([]);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [selectedRowNumber, setSelectedRowNumber] = useState<number | null>(null);

  const [allInfo, setAllInfo] = useState<AllInfo | null>(null);

  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        productUrl: "",
        affShortKey: "",
        productPrice: "",
        coinDiscountRate: "",
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

  const parsePrice = (price: string | number | undefined | null): number => {
      if (price === undefined || price === null || price === '') return 0;
      if (typeof price === 'number') return price;
      const parsed = parseFloat(String(price).replace(/[^0-9.-]+/g, ''));
      return isNaN(parsed) ? 0 : parsed;
  };

  const formatPrice = (price: number): string => {
      return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };
  
  const handleGeneratePreview = async () => {
      const { productUrl, affShortKey, ...product } = form.getValues();
      const isFormValid = await form.trigger(["productUrl", "affShortKey"]);
      
      if (!isFormValid) {
          toast({
              variant: "destructive",
              title: "입력 오류",
              description: "상품 URL과 제휴 단축 키를 올바르게 입력해주세요.",
          });
          return;
      }

      setIsGeneratingPreview(true);
      setPreviewContent("미리보기를 생성 중입니다...");
      setAllInfo(null);
      setIsHtmlMode(false);

      try {
          const infoResponse = await fetch("/api/generate-all", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  target_urls: [productUrl],
                  aff_short_key: [affShortKey]
              }),
          });
          
          const infoResult = await infoResponse.json();
          
          if (!infoResponse.ok || !infoResult.allInfos || infoResult.allInfos.length === 0) {
              const errorMsg = infoResult.error || '상품 정보를 가져오는 중 오류가 발생했습니다.';
              toast({ variant: "destructive", title: "정보 조회 실패", description: errorMsg });
              setPreviewContent(`<p>오류: ${errorMsg}. URL과 제휴키를 확인해주세요.</p>`);
              setIsHtmlMode(true);
              setAllInfo(null);
              return;
          }

          const productInfo = infoResult.allInfos[0] as AllInfo;
          setAllInfo(productInfo);

          if (!productInfo || !productInfo.product_title || !productInfo.final_url) {
              setPreviewContent("<p>조회된 상품 정보가 올바르지 않습니다.</p>");
              setIsHtmlMode(true);
              return;
          }
          
          let content = `<p>${productInfo.product_title}</p><br />`;

          const productPriceNum = parsePrice(product.productPrice);
          const coinDiscountRateNum = parsePrice(product.coinDiscountRate);
          const discountCodePriceNum = parsePrice(product.discountCodePrice);
          const storeCouponPriceNum = parsePrice(product.storeCouponPrice);
          const cardPriceNum = parsePrice(product.cardPrice);

          let finalPrice = productPriceNum;
          
          if (productPriceNum > 0) {
            content += `<p>할인판매가: ${formatPrice(productPriceNum)}</p>`;
          }
          
          if (coinDiscountRateNum > 0) {
            content += `<p>코인할인 ( ${coinDiscountRateNum}% )</p>`;
            const coinDiscountValue = productPriceNum * (coinDiscountRateNum / 100);
            finalPrice -= Math.round(coinDiscountValue / 10) * 10;
          }
          if (discountCodePriceNum > 0 && product.discountCode) {
              content += `<p>할인코드: -${formatPrice(discountCodePriceNum)} ( ${product.discountCode} )</p>`;
              finalPrice -= discountCodePriceNum;
          }
           if (storeCouponPriceNum > 0 && product.storeCouponCode) {
              content += `<p>스토어쿠폰: -${formatPrice(storeCouponPriceNum)} ( ${product.storeCouponCode} )</p>`;
              finalPrice -= storeCouponPriceNum;
          }
          if (cardPriceNum > 0 && product.cardCompanyName) {
              content += `<p>카드할인: -${formatPrice(cardPriceNum)} ( ${product.cardCompanyName} )</p>`;
              finalPrice -= cardPriceNum;
          }
          
          if(finalPrice < productPriceNum && productPriceNum > 0) {
              content += `<br /><p>할인구매가: ${formatPrice(Math.max(0, finalPrice))}</p>`;
          }
          
          content += `<br /><p>할인상품 : <a href="${productInfo.final_url}" target="_blank" rel="noopener noreferrer">특가상품 바로가기</a></p><br />`;

          if (product.productTag) {
              const tags = product.productTag.split(' ').map(tag => tag.trim()).filter(tag => tag).map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
              if (tags) {
                  content += `<p>${tags}</p>`;
              }
          }
          
          setPreviewContent(content);

      } catch (e: any) {
          toast({ variant: "destructive", title: "미리보기 생성 오류", description: e.message });
          setPreviewContent(`<p>미리보기 생성 중 오류 발생: ${e.message}</p>`);
          setIsHtmlMode(true);
      } finally {
        setIsGeneratingPreview(false);
      }
  };


  const handlePostToBand = async (data: FormData) => {
    setIsLoading(true);
    setBandPostResult({ status: 'loading', message: '상품 정보를 가져오는 중...' });

    const originalItem = sheetData.find(item => item.rowNumber === selectedRowNumber);

    try {
        let productInfo = allInfo;
        if (!productInfo || productInfo.original_url !== data.productUrl) {
            const infoResponse = await fetch("/api/generate-all", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    target_urls: [data.productUrl],
                    aff_short_key: [data.affShortKey]
                }),
            });
            const infoResult = await infoResponse.json();
            if (!infoResponse.ok || !infoResult.allInfos || infoResult.allInfos.length === 0) {
                 throw new Error("밴드 게시를 위해 상품 정보를 다시 가져오는 데 실패했습니다.");
            }
            productInfo = infoResult.allInfos[0];
            setAllInfo(productInfo);
        }

        if (!productInfo || !productInfo.product_title || !productInfo.final_url) {
            throw new Error("상품 정보가 올바르지 않아 밴드에 게시할 수 없습니다.");
        }

        setBandPostResult({ status: 'loading', message: '밴드에 글을 게시하는 중...' });
        
        const postContent = previewContent;

        const bandPayload: { content: string; image_url?: string } = { content: postContent };
        if (productInfo.product_main_image_url) {
            bandPayload.image_url = productInfo.product_main_image_url;
        }

        const bandResponse = await fetch("/api/post-to-band", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bandPayload),
        });

        if (bandResponse.ok) {
             setBandPostResult({ status: 'success', message: `상품이 밴드에 성공적으로 게시되었습니다.` });
             toast({
                title: "성공!",
                description: `상품이 밴드에 성공적으로 게시되었습니다.`,
              });
              if (originalItem) {
                 try {
                    const newValues: {[key: string]: any} = {
                      checkup: '1',
                      "글쓰기 시간": new Date().toISOString(),
                    };
                    
                    Object.keys(form.getValues()).forEach(key => {
                        const typedKey = key as keyof FormData;
                        const value = form.getValues(typedKey);
                        if (value) {
                          newValues[typedKey] = value;
                        }
                    });

                    await fetch('/api/sheets', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ rowNumber: originalItem.rowNumber, newValues }),
                    });
                    
                    setSheetData(prev => prev.filter(d => d.rowNumber !== originalItem.rowNumber));
                    setSelectedRowNumber(null);
                    form.reset(); 
                    setAllInfo(null);
                    setPreviewContent("");


                 } catch (sheetError) {
                     console.error("Failed to update sheet after posting:", sheetError);
                     toast({
                         variant: "destructive",
                         title: "시트 업데이트 실패",
                         description: "밴드 글쓰기는 성공했으나, 시트 상태를 업데이트하는 데 실패했습니다. 새로고침 후 확인해주세요.",
                     })
                 }
              }

        } else {
             const bandErrorResult = await bandResponse.json();
             const bandErrorMessage = bandErrorResult.error?.message || bandErrorResult.error || `Status: ${bandResponse.status}`;
             throw new Error(`밴드 게시 실패: ${bandErrorMessage}`);
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

  const handleDeleteSheetRow = async (rowNumber: number) => {
    const originalData = [...sheetData];
    setSheetData(prevData => prevData.filter(item => item.rowNumber !== rowNumber));
    if (selectedRowNumber === rowNumber) {
        setSelectedRowNumber(null);
        form.reset();
        setAllInfo(null);
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

  const handleSelectSheetRow = (item: SheetData) => {
    if (selectedRowNumber === item.rowNumber) {
        setSelectedRowNumber(null);
    } else if (selectedRowNumber === null) {
        setSelectedRowNumber(item.rowNumber);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "복사 완료", description: "클립보드에 복사되었습니다." });
    }, (err) => {
      toast({ variant: "destructive", title: "복사 실패", description: "클립보드 복사에 실패했습니다." });
    });
  };

  const addImageToPreview = (imageUrl: string) => {
    const imageTag = `<img src="${imageUrl}" alt="상세 이미지" style="max-width:100%; height:auto;" /><br />`;
    setPreviewContent(prev => `${prev}${imageTag}`);
    toast({
        title: "이미지 추가 완료",
        description: "선택한 이미지가 미리보기 내용에 추가되었습니다.",
    });
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
                                <p className="text-2xl font-bold text-primary">{item.가격 || "가격 정보 없음"}</p>
                                {item.Runtime && (
                                    <p className="text-xs text-muted-foreground">
                                        확인일시: {new Date(item.Runtime).toLocaleString('ko-KR')}
                                    </p>
                                )}
                                <div className="flex flex-col sm:flex-row gap-2">
                                     <Button asChild variant="outline" className="w-full">
                                        <a href={item.URL} target="_blank" rel="noopener noreferrer">URL 가서 확인하기</a>
                                    </Button>
                                    <Button variant="outline" className="w-full" onClick={() => item.URL && copyToClipboard(item.URL)}>
                                        <ClipboardCopy className="mr-2 h-4 w-4" />
                                        URL 복사하기
                                    </Button>
                                </div>
                                <Separator />
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Button 
                                        onClick={() => handleSelectSheetRow(item)} 
                                        variant={selectedRowNumber === item.rowNumber ? "default" : "outline"}
                                        disabled={selectedRowNumber !== null && selectedRowNumber !== item.rowNumber}
                                        className="w-full"
                                    >
                                        <CheckCircle className={`mr-2 h-4 w-4 ${selectedRowNumber !== item.rowNumber && 'hidden'}`} />
                                        {selectedRowNumber === item.rowNumber ? "선택 해제" : "선택하여 글쓰기"}
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
                  <CarouselPrevious className="hidden sm:flex" />
                  <CarouselNext className="hidden sm:flex" />
                </Carousel>
              )}
            </CardContent>
        </Card>


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
                onSubmit={form.handleSubmit(handlePostToBand)}
                className="space-y-8"
              >
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
                
                {allInfo && (
                  <>
                  <Separator />
                   <div className="space-y-4 rounded-lg border p-4">
                      <Collapsible>
                          <CollapsibleTrigger asChild>
                              <Button type="button" variant="ghost" className="w-full text-left justify-start px-2">
                                  <FileJson className="mr-2 h-4 w-4" />
                                  API 결과값 보기
                                  <ChevronDown className="h-4 w-4 ml-auto" />
                              </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-4">
                              <pre className="text-xs bg-muted p-4 rounded-md max-h-60 overflow-auto">
                                {JSON.stringify(allInfo, null, 2)}
                              </pre>
                          </CollapsibleContent>
                      </Collapsible>
                   </div>
                  </>
                )}

                {allInfo && (
                  <>
                  <Separator />
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                       <CardTitle className="text-xl">미리보기 및 수정</CardTitle>
                       <div className="flex gap-2">
                          <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
                              <DialogTrigger asChild>
                                  <Button type="button" variant="outline" size="sm">
                                    <MessageSquareText className="mr-2 h-4 w-4" />
                                    후기 확인하기
                                  </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                  <DialogHeader>
                                      <DialogTitle>상품 후기 요약 및 이미지</DialogTitle>
                                      <DialogDescription>
                                          AI가 요약한 한국인 후기와 리뷰에 포함된 이미지입니다. 이미지를 클릭하여 본문에 추가할 수 있습니다.
                                      </DialogDescription>
                                  </DialogHeader>
                                  <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
                                      {allInfo.korean_summary && (
                                          <Card>
                                              <CardHeader><CardTitle>AI 후기 요약</CardTitle></CardHeader>
                                              <CardContent>
                                                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                                                      {allInfo.korean_summary}
                                                  </p>
                                              </CardContent>
                                          </Card>
                                      )}
                                      {allInfo.reviewImageUrls && allInfo.reviewImageUrls.length > 0 && (
                                          <Card>
                                              <CardHeader><CardTitle>상세 이미지</CardTitle></CardHeader>
                                              <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                  {allInfo.reviewImageUrls.map((url, index) => (
                                                      <div key={index} className="relative group cursor-pointer" onClick={() => { addImageToPreview(url); setIsReviewDialogOpen(false); }}>
                                                          <img src={url} alt={`Review image ${index + 1}`} className="w-full h-auto rounded-md object-cover aspect-square" />
                                                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                              <div className="text-white flex items-center">
                                                                <ImagePlus className="mr-2 h-5 w-5" /> 본문에 추가
                                                              </div>
                                                          </div>
                                                      </div>
                                                  ))}
                                              </CardContent>
                                          </Card>
                                      )}
                                      {!allInfo.korean_summary && (!allInfo.reviewImageUrls || allInfo.reviewImageUrls.length === 0) && (
                                        <p className="text-center text-muted-foreground py-8">표시할 후기 정보가 없습니다.</p>
                                      )}
                                  </div>
                                  <DialogFooter>
                                      <DialogClose asChild>
                                          <Button type="button" variant="secondary">닫기</Button>
                                      </DialogClose>
                                  </DialogFooter>
                              </DialogContent>
                          </Dialog>
                          <Button type="button" variant="outline" size="sm" onClick={() => setIsHtmlMode(!isHtmlMode)} disabled={!previewContent}>
                              {isHtmlMode ? <Pilcrow className="mr-2 h-4 w-4" /> : <Code className="mr-2 h-4 w-4" />}
                              {isHtmlMode ? "미리보기" : "HTML 소스보기"}
                          </Button>
                       </div>
                    </div>

                    {isHtmlMode ? (
                       <Textarea
                          id="preview-html"
                          placeholder="HTML 소스..."
                          value={previewContent}
                          onChange={(e) => setPreviewContent(e.target.value)}
                          className="min-h-[250px] text-sm font-mono bg-muted/30"
                        />
                    ) : (
                       <div
                          id="preview-display"
                          className="min-h-[250px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: previewContent }}
                       />
                    )}
                  </div>
                  </>
                )}


                <Button
                  type="submit"
                  className="w-full text-lg py-6"
                  disabled={isLoading || !previewContent}
                >
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Rocket className="mr-2 h-5 w-5" />}
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

    