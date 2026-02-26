export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  }
};

async function handleRequest(request, env) {
  const url = new URL(request.url);

  // 首页
  if (request.method === "GET") {
    return new Response(getHtml(), {
      headers: { "Content-Type": "text/html;charset=utf-8" },
    });
  }

  // 微信通知
  if (request.method === "POST" && url.pathname === "/api/send") {
    try {
      const { carNo, userCode, code } = await request.json();

      if (code !== userCode) {
        return Response.json({ success: false, msg: "验证码错误" });
      }

      const WX_TOKEN = env.WX_TOKEN_ENV;
      const WX_UID = env.WX_UID_ENV;

      if (!WX_TOKEN || !WX_UID) {
        return Response.json({
          success: false,
          msg: "环境变量未读取",
          token: WX_TOKEN || null,
          uid: WX_UID || null
        });
      }

      const res = await fetch("https://wxpusher.zjiecode.com/api/send/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appToken: WX_TOKEN,
          content: `车牌号 ${carNo} 车主，请挪车`,
          contentType: 1,
          uids: [WX_UID]
        })
      });

      const data = await res.json();

      return Response.json({
        success: data.code === 1000,
        wxResponse: data
      });

    } catch (e) {
      return Response.json({
        success: false,
        error: e.toString()
      });
    }
  }

  // 电话接口
  if (request.method === "POST" && url.pathname === "/api/call") {
    return Response.json({
      success: true,
      phone: env.PHONE_ENV || null
    });
  }

  return new Response("Not found", { status: 404 });
}

function getHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>挪车通知</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f2f5fa;padding:20px;font-family:-apple-system,BlinkMacSystemFont,Roboto,sans-serif}
.container{max-width:380px;margin:50px auto}
.card{background:#fff;border-radius:20px;box-shadow:0 8px 30px rgba(0,0,0,0.08);padding:32px 24px}
.title{text-align:center;font-size:22px;font-weight:700;color:#222;margin-bottom:6px}
.subtitle{text-align:center;font-size:14px;color:#666;margin-bottom:28px}
.form-item{margin-bottom:16px}
.form-item label{display:block;font-size:14px;color:#333;margin-bottom:6px;font-weight:500}
.form-item input{width:100%;height:48px;border:1px solid #e1e4e8;border-radius:12px;padding:0 16px;font-size:16px;outline:none}
.code-row{display:flex;gap:12px}
#codeCanvas{width:120px;height:48px;border-radius:12px;background:#f5f7fa;cursor:pointer}
.btn{width:100%;height:52px;border-radius:14px;font-size:16px;font-weight:600;border:none;margin-bottom:12px}
.btn-call{background:#007AFF;color:#fff}
.btn-notify{background:#34C759;color:#fff}
.tip{text-align:center;font-size:12px;color:#999;margin-top:16px}
</style>
</head>
<body>
<div class="container">
  <div class="card">
    <div class="title">临时挪车通知</div>
    <div class="subtitle">扫码联系车主，保护隐私</div>

    <div class="form-item">
      <label>车牌号</label>
      <input type="text" id="carNo" placeholder="如：京A12345">
    </div>

    <div class="form-item">
      <label>验证码</label>
      <div class="code-row">
        <input type="text" id="codeInput" maxlength="4">
        <canvas id="codeCanvas"></canvas>
      </div>
    </div>

    <button class="btn btn-call" onclick="call()">一键拨打车主电话</button>
    <button class="btn btn-notify" onclick="sendNotify()">微信通知车主挪车</button>
    <div class="tip">仅用于挪车，隐私保护</div>
  </div>
</div>

<script>
let validateCode = "";

function genCode(){
  const c = "0123456789ABCDEFGHJKLMNPQRSTWXYZ";
  validateCode = Array(4).fill().map(()=>c[Math.floor(Math.random()*c.length)]).join('');
  const e = document.getElementById("codeCanvas"),x = e.getContext("2d");
  e.width=240;e.height=96;x.scale(2,2);
  x.fillStyle="#f5f7fa";x.fillRect(0,0,120,48);
  x.font="bold 24px Arial";x.fillStyle="#007AFF";
  x.textAlign="center";x.textBaseline="middle";
  x.fillText(validateCode,60,24);
}

async function call(){
  const res = await fetch('/api/call', { method:'POST' });
  const data = await res.json();
  if(data.success && data.phone){
    location.href = 'tel:' + data.phone;
  } else {
    alert('获取号码失败');
  }
}

async function sendNotify(){
  const carNo = document.getElementById('carNo').value.trim();
  const userCode = document.getElementById('codeInput').value.trim().toUpperCase();
  if(!carNo){alert('请输入车牌号');return}
  if(!userCode){alert('请输入验证码');return}

  const r = await fetch('/api/send',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({carNo, userCode, code:validateCode})
  });

  const d = await r.json();

  if(d.success){
    alert("✅ 发送成功！");
  }else{
    alert("❌ 发送失败：\n" + JSON.stringify(d,null,2));
  }

  genCode();
}

window.onload=()=>{genCode();document.getElementById('codeCanvas').onclick=genCode}
</script>
</body>
</html>`;
}