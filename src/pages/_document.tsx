/**
 * _document.tsx — Next.js自定义Document
 *
 * 【前端】全局HTML结构
 *
 * 职责：
 * - 设置页面语言（lang="en"）
 * - 配置favicon
 * - 自定义HTML结构
 */
import React from "react";
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="http://10.133.180.115:3007/logo/ai_logo.png"/>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}