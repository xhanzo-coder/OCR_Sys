// 使用ES模块语法导入node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');
const path = require('path');

async function testOcrApi() {
  try {
    console.log('开始测试OCR API...');
    
    // 使用一个硬编码的简单图片Base64数据进行测试
    // 这是一个简单的PNG图片，包含一些文字
    const imageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAApgAAAKYB3X3/OAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANCSURBVEiJtZZPbBtFFMZ/M7ubXdtdb1xSFyeilBapySVU8h8OoFaooFSqiihIVIpQBKci6KEg9Q6H9kovIHoCIVQJJCKE1ENFjnAgcaSGC6rEnxBwA04Tx43t2FnvDAfjkNibxgHxnWb2e/u992bee7tCa00YFsffekFY+nUzFtjW0LrvjRXrCDIAaPLlW0nHL0SsZtVoaF98mLrx3pdhOqLtYPHChahZcYYO7KvPFxvRl5XPp1sN3adWiD1ZAqD6XYK1b/dvE5IWryTt2udLFedwc1+9kLp+vbbpoDh+6TklxBeAi9TL0taeWpdmZzQDry0AcO+jQ12RyohqqoYoo8RDwJrU+qXkjWtfi8Xxt58BdQuwQs9qC/afLwCw8tnQbqYAPsgxE1S6F3EAIXux2oQFKm0ihMsOF71dHYx+f3NND68ghCu1YIoePPQN1pGRABkJ6Bus96CutRZMydTl+TvuiRW1m3n0eDl0vRPcEysqdXn+jsQPsrHMquGeXEaY4Yk4wxWcY5V/9scqOMOVUFthatyTy8QyqwZ+kDURKoMWxNKr2EeqVKcTNOajqKoBgOE28U4tdQl5p5bwCw7BWquaZSzAPlwjlithJtp3pTImSqQRrb2Z8PHGigD4RZuNX6JYj6wj7O4TFLbCO/Mn/m8R+h6rYSUb3ekokRY6f/YukArN979jcW+V/S8g0eT/N3VN3kTqWbQ428m9/8k0P/1aIhF36PccEl6EhOcAUCrXKZXXWS3XKd2vc/TRBG9O5ELC17MmWubD2nKhUKZa26Ba2+D3P+4/MNCFwg59oWVeYhkzgN/JDR8deKBoD7Y+ljEjGZ0sosXVTvbc6RHirr2reNy1OXd6pJsQ+gqjk8VWFYmHrwBzW/n+uMPFiRwHB2I7ih8ciHFxIkd/3Omk5tCDV1t+2nNu5sxxpDFNx+huNhVT3/zMDz8usXC3ddaHBj1GHj/As08fwTS7Kt1HBTmyN29vdwAw+/wbwLVOJ3uAD1wi/dUH7Qei66PfyuRj4Ik9is+hglfbkbfR3cnZm7chlUWLdwmprtCohX4HUtlOcQjLYCu+fzGJH2QRKvP3UNz8bWk1qMxjGTOMThZ3kvgLI5AzFfo379UAAAAASUVORK5CYII=";
    
    console.log(`使用硬编码的测试图片，Base64长度: ${imageBase64.length}`);
    console.log(`Base64前缀: ${imageBase64.substring(0, 50)}...`);

    // 发送请求到我们的OCR API
    console.log('发送请求到OCR API...');
    const response = await fetch('http://localhost:3000/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: imageBase64,
      }),
    });

    console.log(`API响应状态: ${response.status} ${response.statusText}`);
    
    // 解析响应
    const data = await response.json();
    
    if (data.error) {
      console.error('API返回错误:', data.error);
      if (data.details) {
        console.error('错误详情:', JSON.stringify(data.details, null, 2));
      }
      return;
    }
    
    console.log('API响应成功:');
    if (data.extracted_text) {
      console.log('提取的文本:', data.extracted_text);
    } else {
      console.log('未返回提取的文本');
    }
    
    if (data.boxed_image_base64) {
      console.log(`返回的图片Base64长度: ${data.boxed_image_base64.length}`);
      console.log(`图片Base64前缀: ${data.boxed_image_base64.substring(0, 50)}...`);
      
      // 可选：将返回的图片保存到文件
      try {
        const resultImageBuffer = Buffer.from(data.boxed_image_base64.split(',')[1], 'base64');
        fs.writeFileSync(path.join(__dirname, 'ocr_result.jpg'), resultImageBuffer);
        console.log('已将结果图片保存到 ocr_result.jpg');
      } catch (err) {
        console.error('保存结果图片失败:', err);
      }
    } else {
      console.log('未返回处理后的图片');
    }
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 执行测试
testOcrApi(); 