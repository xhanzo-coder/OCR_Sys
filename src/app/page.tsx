"use client";

import { Inter } from 'next/font/google';
import { UploadCloud, X, Trash2 } from 'lucide-react';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Roboto_Mono } from 'next/font/google';

// 定义OCR结果的接口
interface TextBlock {
  text: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface OcrResult {
  text_blocks: TextBlock[];
  full_text: string;
}

// 图片查看器模态框组件
interface ImageViewerProps {
  imageUrl: string | null;
  onClose: () => void;
}

const ImageViewer = ({ imageUrl, onClose }: ImageViewerProps) => {
  if (!imageUrl) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden">
        <button 
          className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md z-10"
          onClick={onClose}
        >
          <X size={24} />
        </button>
        <div className="relative w-full h-[80vh]">
          <Image 
            src={imageUrl} 
            alt="Enlarged image" 
            fill 
            style={{ objectFit: 'contain' }} 
          />
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // 处理图片上传和OCR识别
  const processImage = async (imageBase64: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 调用我们的 OCR API
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: imageBase64, // 发送完整的 data URL
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '识别过程中发生错误');
      }
      
      const data = await response.json() as OcrResult;
      
      // 更新 UI 显示结果
      setRecognizedText(data.full_text || '未识别到文字');
      setTextBlocks(data.text_blocks || []);
      
      // 在原图上绘制边框
      drawTextBoxes(imageBase64, data.text_blocks);
    } catch (err: any) {
      console.error('OCR 处理错误:', err);
      setError(err.message || '识别过程中发生未知错误');
      setRecognizedText('');
      setTextBlocks([]);
      setProcessedImage(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 在原图上绘制文字边框
  const drawTextBoxes = (imageUrl: string, blocks: TextBlock[]) => {
    if (!blocks || blocks.length === 0) {
      setProcessedImage(null);
      return;
    }
    
    // 创建图片元素
    const img = new window.Image();
    img.onload = () => {
      // 创建canvas元素
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      // 绘制原图
      ctx.drawImage(img, 0, 0, img.width, img.height);
      
      // 设置红色边框样式
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 2;
      
      // 绘制每个文字块的边框
      blocks.forEach(block => {
        const { x, y, width, height } = block.position;
        const boxX = x * img.width;
        const boxY = y * img.height;
        const boxWidth = width * img.width;
        const boxHeight = height * img.height;
        
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
      });
      
      // 转换为 data URL
      const processedDataUrl = canvas.toDataURL('image/jpeg');
      setProcessedImage(processedDataUrl);
    };
    
    img.src = imageUrl;
    imageRef.current = img;
  };

  // 按照文本块的垂直位置排序，并分段显示
  const getFormattedText = (blocks: TextBlock[]): string => {
    if (!blocks || blocks.length === 0) return '未识别到文字';
    
    // 按照y坐标（垂直位置）排序
    const sortedBlocks = [...blocks].sort((a, b) => a.position.y - b.position.y);
    
    // 将文本块拼接成分段文本
    return sortedBlocks.map(block => block.text).join('\n\n');
  };

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageBase64 = e.target?.result as string;
        setSelectedImage(imageBase64);
        processImage(imageBase64);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageBase64 = e.target?.result as string;
        setSelectedImage(imageBase64);
        processImage(imageBase64);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // 处理图片点击放大
  const handleViewImage = (imageUrl: string) => {
    setViewingImage(imageUrl);
  };

  // 关闭图片查看器
  const handleCloseViewer = () => {
    setViewingImage(null);
  };

  // 清除所有数据，重置界面
  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡，防止触发图片点击放大
    setSelectedImage(null);
    setProcessedImage(null);
    setRecognizedText('');
    setTextBlocks([]);
    setError(null);
    setViewingImage(null);
    
    // 清除文件输入框的值
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f7f7f7] p-4">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-4xl">
        <h1 className="text-2xl font-serif text-center mb-6 text-gray-800">图像文字识别</h1>
        
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
          onClick={() => document.getElementById('file-upload')?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {isLoading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-2"></div>
              <p className="text-gray-500">正在识别中...</p>
            </div>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-500">点击或拖拽图片到这里</p>
            </>
          )}
          <input 
            id="file-upload" 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handleImageUpload}
            disabled={isLoading}
          />
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-4 relative">
            <h2 className="text-lg font-medium mb-3 text-gray-700">原始图片</h2>
            
            {/* 删除按钮 */}
            {selectedImage && (
              <button 
                className="absolute top-3 right-3 p-1 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
                onClick={handleClearAll}
                title="清除所有数据"
              >
                <Trash2 size={20} className="text-red-500" />
              </button>
            )}
            
            <div className="h-48 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
              {selectedImage ? (
                <div className="relative w-full h-full cursor-pointer" onClick={() => handleViewImage(selectedImage)}>
                  <Image 
                    src={selectedImage} 
                    alt="Uploaded image" 
                    fill 
                    style={{ objectFit: 'contain' }} 
                  />
                </div>
              ) : (
                <p className="text-gray-400 text-sm">上传图片后显示</p>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-medium mb-3 text-gray-700">处理后图片</h2>
            <div className="h-48 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
              {processedImage ? (
                <div className="relative w-full h-full cursor-pointer" onClick={() => handleViewImage(processedImage)}>
                  <Image 
                    src={processedImage} 
                    alt="Processed image" 
                    fill 
                    style={{ objectFit: 'contain' }} 
                  />
                </div>
              ) : (
                <p className="text-gray-400 text-sm">识别后显示</p>
              )}
            </div>
          </div>
          
          <div className="border rounded-lg p-4 md:col-span-2">
            <h2 className="text-lg font-medium mb-3 text-gray-700">识别结果 (文字)</h2>
            <div className="h-48 bg-gray-100 rounded p-3 overflow-auto">
              {textBlocks.length > 0 ? (
                <div>
                  <p className="font-medium">完整文本:</p>
                  <pre className="mb-4 whitespace-pre-wrap font-sans">{getFormattedText(textBlocks)}</pre>
                  
                  <p className="font-medium">详细信息:</p>
                  <ul className="list-disc list-inside">
                    {textBlocks.map((block, index) => (
                      <li key={index} className="mb-1">
                        "{block.text}" - 位置: x:{(block.position.x * 100).toFixed(1)}%, 
                        y:{(block.position.y * 100).toFixed(1)}%
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">识别后的文字将显示在这里</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 图片查看器模态框 */}
      <ImageViewer imageUrl={viewingImage} onClose={handleCloseViewer} />
    </main>
  );
}
