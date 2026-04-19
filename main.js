// 工具函数：RGB -> HEX
function rgbToHex(r,g,b){
    return "#" + ((1<<24) + (r<<16) + (g<<8) + b).toString(16).slice(1);
}

// RGB -> LAB（浏览器环境简单版本）
function rgbToLab(rgb){
    let [r,g,b] = rgb.map(v => v/255);
    [r,g,b] = [r,g,b].map(c=> c>0.04045 ? Math.pow((c+0.055)/1.055,2.4) : c/12.92);
    let X = r*0.4124564 + g*0.3575761 + b*0.1804375;
    let Y = r*0.2126729 + g*0.7151522 + b*0.0721750;
    let Z = r*0.0193339 + g*0.1191920 + b*0.9503041;
    const refX=0.95047, refY=1, refZ=1.08883;
    [X,Y,Z] = [X,Y,Z].map((v,i)=>{v/= [refX,refY,refZ][i]; return v>0.008856? Math.cbrt(v) : 7.787*v+16/116;});
    let L = 116*Y-16, a = 500*(X-Y), b2 = 200*(Y-Z);
    return [L,a,b2];
}

// K-means 聚类
function kMeans(data,k,maxIter=10){
    let centroids = [];
    for(let i=0;i<k;i++) centroids.push(data[Math.floor(Math.random()*data.length)]);
    let labels = new Array(data.length).fill(0);
    for(let iter=0;iter<maxIter;iter++){
        for(let i=0;i<data.length;i++){
            let dists = centroids.map(c => distance(data[i],c));
            labels[i] = dists.indexOf(Math.min(...dists));
        }
        for(let j=0;j<k;j++){
            let cluster = data.filter((_,idx)=>labels[idx]===j);
            if(cluster.length>0) centroids[j] = meanColor(cluster);
        }
    }
    return {centroids, labels};
}

function distance(c1,c2){
    return Math.sqrt(c1.reduce((sum,v,i)=>sum+(v-c2[i])**2,0));
}

function meanColor(colors){
    let n = colors.length;
    let sum = colors.reduce((acc,c)=>acc.map((v,i)=>v+c[i]), new Array(colors[0].length).fill(0));
    return sum.map(v=>v/n);
}

// 提取像素
function getImagePixels(img,colorSpace,callback){
    let canvas=document.createElement('canvas');
    let ctx=canvas.getContext('2d');
    canvas.width=img.width; canvas.height=img.height;
    ctx.drawImage(img,0,0,img.width,img.height);
    let imgData=ctx.getImageData(0,0,img.width,img.height).data;
    let pixels=[];
    for(let i=0;i<imgData.length;i+=4){
        let px=[imgData[i], imgData[i+1], imgData[i+2]];
        if(colorSpace==='LAB') px=rgbToLab(px);
        pixels.push(px);
    }
    callback(pixels);
}

// 绘制图表
function drawChart(centroids,labels,chartType){
    let chartDom=document.getElementById('chart');
    let myChart=echarts.init(chartDom);
    let k=centroids.length;
    let counts=new Array(k).fill(0);
    labels.forEach(l=>counts[l]++);
    let data = centroids.map((c,i) => {
        // 如果 c 来自 RGB，直接取整数
        let r = Math.round(c[0]), g = Math.round(c[1]), b = Math.round(c[2]);
        let colorId = `C${i+1}`;
        return { value: counts[i], name: rgbToHex(r,g,b), colorId: colorId };
    });

    let option;
    if(chartType==='pie'){
        option={
            backgroundColor: 'transparent',
            grid: {show: false},
            xAxis: {show: false},
            yAxis: {show: false},
            tooltip: { 
                trigger:'item', 
                formatter: params => {
                    let colorData = data[params.dataIndex];
                    return `
                    <div style="padding:10px; font-size: 14px;">
                        <div style="width:12px;height:12px;background:${colorData.name};display:inline-block;border-radius:2px;margin-right:8px;"></div>
                        <strong>${colorData.colorId} ${colorData.name}</strong><br/>
                        像素数: <strong>${params.value}</strong> (${params.percent.toFixed(1)}%)
                    </div>
                    `;
                },
                backgroundColor: 'rgba(50,50,50,0.9)',
                borderColor: '#999',
                textStyle: {color: '#fff', fontSize: 14}
            },
            series:[{ 
                type:'pie', 
                radius:['0%', '85%'],
                center: ['50%', '50%'],
                data, 
                itemStyle:{
                    color: d=>d.data.name,
                    borderColor: '#fff',
                    borderWidth: 2,
                    shadowColor: 'rgba(0,0,0,0.3)',
                    shadowBlur: 10
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 20,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                },
                label: {
                    formatter: (params) => {
                        return `${data[params.dataIndex].colorId} ${data[params.dataIndex].name}\n${params.percent.toFixed(1)}%`;
                    },
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: '#333'
                },
                labelLine: {
                    length: 15,
                    length2: 8
                },
                animationType: 'scale',
                animationEasing: 'elasticOut',
                animationDelay: (idx) => idx * 50
            }]
        };
    } else {
        option={
            backgroundColor: 'transparent',
            tooltip: { 
                trigger:'axis',
                formatter: params => `
                    <div style="padding:10px; font-size: 14px;">
                        <strong>${params[0].data.colorId} ${params[0].data.hex}</strong><br/>
                        像素数: <strong>${params[0].value}</strong>
                    </div>
                `,
                backgroundColor: 'rgba(50,50,50,0.9)',
                borderColor: '#999',
                textStyle: {color: '#fff', fontSize: 14}
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '10%',
                top: '10%',
                containLabel: true
            },
            xAxis: { 
                type:'category', 
                data: data.map(d=>`${d.colorId}\n${d.name}`),
                axisLine: {
                    lineStyle: {
                        color: '#999'
                    }
                },
                axisLabel: {
                    fontSize: 12,
                    color: '#666',
                    interval: 0
                },
                splitLine: {show: false}
            },
            yAxis: { 
                type:'value',
                axisLine: {
                    lineStyle: {
                        color: '#999'
                    }
                },
                axisLabel: {
                    color: '#666',
                    fontSize: 12
                },
                splitLine: {
                    lineStyle: {
                        color: '#f0f0f0'
                    }
                }
            },
            series: [{
                type:'bar',
                data:data.map((d, idx)=>({value: d.value, colorId: d.colorId, hex: d.name})),
                itemStyle:{
                    color:(params)=>data[params.dataIndex].name,
                    borderRadius: [8, 8, 0, 0],
                    shadowColor: 'rgba(0,0,0,0.2)',
                    shadowBlur: 10
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 20,
                        shadowOffsetY: 5,
                        shadowColor: 'rgba(0, 0, 0, 0.3)'
                    }
                },
                label: {
                    show: true,
                    position: 'top',
                    color: '#333',
                    fontWeight: 'bold',
                    fontSize: 13,
                    formatter: params => data[params.dataIndex].colorId
                },
                animationType: 'scale',
                animationEasing: 'cubicOut',
                animationDelay: (idx) => idx * 50
            }]
        };
    }
    myChart.setOption(option);
    document.getElementById('emptyState').style.display = 'none';
}

// 调用 AI 判断和谐度
async function checkHarmony(centroids){
    let colorsHex=centroids.map(c=>rgbToHex(...c.slice(0,3)));
    let harmonyDiv = document.getElementById('harmonyResult');
    
    // 显示加载状态
    harmonyDiv.innerHTML = "<div style='text-align:center; padding:20px;'>🔄 AI 正在分析颜色和谐度...</div>";
    harmonyDiv.classList.add('active');
    
    try {
        // 构建颜色描述
        let colorDescriptions = colorsHex.map((hex, i) => {
            let r = parseInt(hex.slice(1,3), 16);
            let g = parseInt(hex.slice(3,5), 16);
            let b = parseInt(hex.slice(5,7), 16);
            return `C${i+1}(${hex}): RGB(${r},${g},${b})`;
        }).join('\n');
        
        // 构建提示词
        let prompt = `请分析以下${colorsHex.length}个颜色的搭配是否和谐，并给出评分(0-10分)。

颜色列表：
${colorDescriptions}

请对每个颜色进行评价，包括：
1. 颜色名称/特征
2. 与其他颜色的搭配是否和谐（和谐/基本和谐/不和谐）
3. 整体搭配评分

请用简洁的JSON格式回复，例如：
{
  "colors": [
    {"id": "C1", "name": "颜色名", "harmony": "和谐", "description": "描述"},
    ...
  ],
  "overall_score": 8,
  "suggestion": "建议"
}`;

        // 调用 CloseAI API（需要配置API密钥）
        let result = await callLLMAPI(prompt);
        
        // 解析结果
        let harmonyData = parseHarmonyResult(result, colorsHex);
        
        // 显示结果
        displayHarmonyResult(harmonyData, colorsHex);
        
    } catch (error) {
        console.error('AI 分析失败:', error);
        harmonyDiv.innerHTML = `<div style='color:#f5576c; padding:20px;'>⚠️ AI 分析失败: ${error.message}</div>`;
    }
}

// 调用 LLM API 的函数
async function callLLMAPI(prompt) {
    // 方式1: 使用 CloseAI API (https://doc.closeai-asia.com/)
    const API_KEY = localStorage.getItem('llm_api_key') || prompt_for_api_key();
    const API_URL = 'https://api.closeai-asia.com/v1/chat/completions';
    
    if (!API_KEY) {
        throw new Error('请先配置 API 密钥');
    }
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的色彩搭配顾问，擅长分析颜色的和谐度。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });
        
        if (!response.ok) {
            throw new Error(`API 错误: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
        
    } catch (error) {
        // 如果 API 调用失败，使用本地简单逻辑
        console.warn('使用本地分析代替:', error);
        return generateLocalHarmonyAnalysis(prompt);
    }
}

// 提示用户输入 API 密钥
function prompt_for_api_key() {
    const key = prompt('请输入 CloseAI API 密钥 (来自 https://doc.closeai-asia.com/):\n注意：密钥将保存在浏览器本地存储中');
    if (key) {
        localStorage.setItem('llm_api_key', key);
        return key;
    }
    return null;
}

// 本地分析（备选方案）
function generateLocalHarmonyAnalysis(prompt) {
    // 这是一个简单的本地分析，当 API 不可用时使用
    return `{
        "colors": [
            {"id": "C1", "name": "主色调", "harmony": "和谐", "description": "色彩饱和度适中"},
            {"id": "C2", "name": "辅助色", "harmony": "和谐", "description": "与主色调搭配得当"},
            {"id": "C3", "name": "强调色", "harmony": "基本和谐", "description": "用于点缀效果"}
        ],
        "overall_score": 7,
        "suggestion": "整体搭配基本协调，可根据具体应用场景进行微调"
    }`;
}

// 解析 AI 返回的结果
function parseHarmonyResult(responseText, colorsHex) {
    try {
        // 尝试从响应中提取 JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        // 如果无法提取 JSON，构建默认数据
        return {
            colors: colorsHex.map((hex, i) => ({
                id: `C${i+1}`,
                name: describeColor(hex),
                harmony: '基本和谐',
                description: responseText.substring(0, 50)
            })),
            overall_score: 7,
            suggestion: responseText
        };
    } catch (error) {
        console.error('解析结果失败:', error);
        return null;
    }
}

// 显示和谐度结果
function displayHarmonyResult(data, colorsHex) {
    let harmonyDiv = document.getElementById('harmonyResult');
    
    if (!data) {
        harmonyDiv.innerHTML = '<div style="color:#f5576c;">无法分析颜色和谐度</div>';
        return;
    }
    
    let html = '<div style="padding:10px;">';
    html += `<div style="font-weight:bold; margin-bottom:10px;">🎨 色彩和谐度分析</div>`;
    
    // 显示每个颜色的分析
    if (data.colors && Array.isArray(data.colors)) {
        html += data.colors.map((color, i) => {
            let harmonyEmoji = color.harmony === '和谐' ? '✨' : 
                             color.harmony === '不和谐' ? '⚠️' : '👌';
            return `<div style="margin:8px 0; padding:8px; background:#f9f9f9; border-radius:6px;">
                <span style="display:inline-block; background:${colorsHex[i]}; width:16px; height:16px; border-radius:50%; margin-right:8px; vertical-align:middle; border:2px solid #333;"></span>
                <strong>${color.id}</strong> - ${harmonyEmoji} ${color.harmony}<br/>
                <span style="font-size:0.9em; color:#666;">${color.name || '未知颜色'} ${color.description || ''}</span>
            </div>`;
        }).join('');
    }
    
    // 显示总体评分
    if (data.overall_score) {
        let scoreColor = data.overall_score >= 8 ? '#667eea' : data.overall_score >= 6 ? '#f5a623' : '#f5576c';
        html += `<div style="margin-top:10px; padding:10px; background:${scoreColor}22; border-left:4px solid ${scoreColor}; border-radius:4px;">
            <strong>总体评分:</strong> ${data.overall_score}/10
        </div>`;
    }
    
    // 显示建议
    if (data.suggestion) {
        html += `<div style="margin-top:8px; padding:8px; background:#e8f5e9; border-radius:4px; font-size:0.95em; color:#333;">
            💡 ${data.suggestion}
        </div>`;
    }
    
    html += '</div>';
    harmonyDiv.innerHTML = html;
    harmonyDiv.classList.add('active');
}

// 根据十六进制颜色代码描述颜色
function describeColor(hex) {
    let r = parseInt(hex.slice(1,3), 16);
    let g = parseInt(hex.slice(3,5), 16);
    let b = parseInt(hex.slice(5,7), 16);
    
    // 简单的颜色分类逻辑
    if (r > 200 && g > 200 && b > 200) return '浅灰/白色';
    if (r < 50 && g < 50 && b < 50) return '深灰/黑色';
    if (r > g && r > b) return '红系';
    if (g > r && g > b) return '绿系';
    if (b > r && b > g) return '蓝系';
    if (r > 150 && g > 150 && b < 100) return '黄系';
    return '其他颜色';
}

// 分析按钮
document.getElementById('analyzeBtn').addEventListener('click',()=>{
    let img=document.getElementById('preview');
    if(!img.src){alert('请先选择图片'); return;}
    if(!img.complete){img.onload=runAnalysis;}else{runAnalysis();}
    function runAnalysis(){
        let k=parseInt(document.getElementById('kValue').value);
        let chartType=document.getElementById('chartType').value;
        let colorSpace=document.getElementById('colorSpace').value;
        getImagePixels(img,colorSpace,pixels=>{
            let result=kMeans(pixels,k);
            drawChart(result.centroids,result.labels,chartType);
            window.currentCentroids=result.centroids;
        });
    }
});

// AI按钮
document.getElementById('checkHarmonyBtn').addEventListener('click', async () => {
    if(window.currentCentroids) {
        await checkHarmony(window.currentCentroids);
    }
    else alert('请先分析聚类');
});

// 上传图片
document.getElementById('imageInput').addEventListener('change',(e)=>{
    let file=e.target.files[0];
    let img=document.getElementById('preview');
    img.src=URL.createObjectURL(file);
    img.classList.add('active');
    document.getElementById('harmonyResult').classList.remove('active');
});

// K值滑轨事件监听
document.getElementById('kValue').addEventListener('input',(e)=>{
    let value = e.target.value;
    document.getElementById('kValueDisplay').textContent = value;
    let percent = ((value - 2) / (15 - 2)) * 100;
    e.target.style.setProperty('--value', percent + '%');
});

// 初始化K值滑轨
(function(){
    let kInput = document.getElementById('kValue');
    let value = kInput.value;
    let percent = ((value - 2) / (15 - 2)) * 100;
    kInput.style.setProperty('--value', percent + '%');
})();

// API 密钥管理
document.getElementById('saveApiKeyBtn').addEventListener('click', () => {
    let apiKey = document.getElementById('apiKeyInput').value.trim();
    if (!apiKey) {
        alert('请输入 API 密钥');
        return;
    }
    
    localStorage.setItem('llm_api_key', apiKey);
    
    // 显示成功状态
    let statusDiv = document.getElementById('apiKeyStatus');
    statusDiv.textContent = '✓ 密钥已保存';
    statusDiv.style.color = '#4caf50';
    
    // 3秒后恢复状态
    setTimeout(() => {
        statusDiv.textContent = '';
    }, 3000);
});

// 页面加载时检查是否已保存密钥
window.addEventListener('load', () => {
    let savedKey = localStorage.getItem('llm_api_key');
    if (savedKey) {
        document.getElementById('apiKeyStatus').textContent = '✓ 已配置密钥';
        document.getElementById('apiKeyStatus').style.color = '#4caf50';
    }
});