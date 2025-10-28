"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Copy, Rocket } from "lucide-react";

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

const formSchema = z.object({
  affShortKey: z.string().optional(),
  af: z.string().optional(),
  productUrl: z.string().url({ message: "유효한 URL을 입력해주세요." }),
  productPrice: z.coerce
    .number()
    .min(1, { message: "상품 판매가는 0보다 커야 합니다." }),
  discountCode: z.string().optional(),
  discountCodePrice: z.coerce.number().nonnegative().optional().default(0),
  storeCouponCode: z.string().optional(),
  storeCouponPrice: z.coerce.number().nonnegative().optional().default(0),
  coinPrice: z.coerce.number().nonnegative().optional().default(0),
  cardPrice: z.coerce.number().nonnegative().optional().default(0),
});

type FormData = z.infer<typeof formSchema>;

export default function Home() {
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      affShortKey: "",
      af: "",
      productUrl: "",
      discountCode: "",
      discountCodePrice: 0,
      storeCouponCode: "",
      storeCouponPrice: 0,
      coinPrice: 0,
      cardPrice: 0,
    },
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
      const response = await fetch(
        "/api/generate-image-url",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_url: data.productUrl }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const imageUrl = result.imageUrl;

      if (!imageUrl) {
        throw new Error("이미지 URL을 가져올 수 없습니다.");
      }

      const finalUrl = new URL(data.productUrl);
      finalUrl.searchParams.set("disableNav", "YES");
      finalUrl.searchParams.set("sourceType", "620");
      finalUrl.searchParams.set("_immersiveMode", "true");
      finalUrl.searchParams.set("wx_navbar_transparent", "true");
      finalUrl.searchParams.set("channel", "coin");
      finalUrl.searchParams.set("wx_statusbar_hidden", "true");
      if (data.af) finalUrl.searchParams.set("af", data.af);
      finalUrl.searchParams.set("isdl", "y");
      if (data.affShortKey)
        finalUrl.searchParams.set("aff_short_key", data.affShortKey);
      finalUrl.searchParams.set("aff_platform", "true");

      const finalPrice =
        data.productPrice -
        (data.discountCodePrice || 0) -
        (data.storeCouponPrice || 0) -
        (data.coinPrice || 0) -
        (data.cardPrice || 0);

      let discountDetails = "";
      if (data.discountCodePrice && data.discountCodePrice > 0) {
        discountDetails += `<p style="margin: 5px 0; font-size: 16px;"><strong>할인코드 (${
          data.discountCode || ""
        }):</strong> -${data.discountCodePrice.toLocaleString()}원</p>`;
      }
      if (data.storeCouponPrice && data.storeCouponPrice > 0) {
        discountDetails += `<p style="margin: 5px 0; font-size: 16px;"><strong>스토어쿠폰 (${
          data.storeCouponCode || ""
        }):</strong> -${data.storeCouponPrice.toLocaleString()}원</p>`;
      }
      if (data.coinPrice && data.coinPrice > 0) {
        discountDetails += `<p style="margin: 5px 0; font-size: 16px;"><strong>코인할인:</strong> -${data.coinPrice.toLocaleString()}원</p>`;
      }
      if (data.cardPrice && data.cardPrice > 0) {
        discountDetails += `<p style="margin: 5px 0; font-size: 16px;"><strong>카드할인:</strong> -${data.cardPrice.toLocaleString()}원</p>`;
      }

      const htmlTemplate = `
<div style="font-family: 'Inter', sans-serif; border: 1px solid #e0e0e0; border-radius: 12px; padding: 24px; max-width: 700px; margin: 20px auto; text-align: center; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
  <a href="${finalUrl.toString()}" target="_blank" rel="noopener noreferrer" style="text-decoration: none;">
    <img src="${imageUrl}" alt="Product Image" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 20px;">
  </a>
  <h2 style="margin-top: 0; font-size: 28px; font-weight: 700; color: #111;">놓칠 수 없는 특별가!</h2>
  <p style="font-size: 18px; color: #555;">지금 바로 확인해보세요.</p>
  
  <div style="text-align: left; margin: 25px 0; padding: 20px; background-color: #FFF9F6; border-radius: 8px; border: 1px dashed #FFD9C7;">
    <p style="margin: 5px 0; font-size: 16px; color: #777;"><strong>정상가:</strong> <span style="text-decoration: line-through;">${data.productPrice.toLocaleString()}원</span></p>
    ${discountDetails}
    <hr style="border: 0; border-top: 1px solid #FFEAE0; margin: 15px 0;">
    <p style="margin: 10px 0; font-size: 22px; font-weight: 800; color: #FF4F00;"><strong>🔥 최종혜택가:</strong> ${finalPrice.toLocaleString()}원</p>
  </div>
  
  <a href="${finalUrl.toString()}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #FF4F00; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 20px; transition: background-color 0.3s ease;">
    최저가로 구매하기
  </a>
</div>`;
      setGeneratedHtml(htmlTemplate.trim());
    } catch (error) {
      console.error("Error generating HTML:", error);
      toast({
        variant: "destructive",
        title: "오류 발생",
        description:
          "HTML 생성에 실패했습니다. 입력값을 확인하거나 다시 시도해주세요.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formFields = [
    { name: "affShortKey", label: "수익 파라미터 (aff_short_key)", placeholder: "예: aff_short_key" },
    { name: "af", label: "AF값", placeholder: "예: af" },
    { name: "productUrl", label: "알리익스프레스 상품 URL", placeholder: "https://www.aliexpress.com/...", isRequired: true },
    { name: "productPrice", label: "상품판매가", placeholder: "숫자만 입력", type: "number", isRequired: true },
    { name: "discountCode", label: "할인코드", placeholder: "예: KR1234" },
    { name: "discountCodePrice", label: "할인코드 할인가", placeholder: "숫자만 입력", type: "number" },
    { name: "storeCouponCode", label: "스토어쿠폰 코드", placeholder: "예: STORE1000" },
    { name: "storeCouponPrice", label: "스토어쿠폰 코드 할인가", placeholder: "숫자만 입력", type: "number" },
    { name: "coinPrice", label: "코인할인가", placeholder: "숫자만 입력", type: "number" },
    { name: "cardPrice", label: "카드할인가", placeholder: "숫자만 입력", type: "number" },
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
                  {formFields.map((fieldInfo) => (
                    <FormField
                      key={fieldInfo.name}
                      control={form.control}
                      name={fieldInfo.name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {fieldInfo.label}
                            {fieldInfo.isRequired && (
                              <span className="text-destructive"> *</span>
                            )}
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
                  <Button
                    type="submit"
                    className="w-full text-lg py-6"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : null}
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
