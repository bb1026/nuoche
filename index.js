export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  }
};

async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (request.method === "GET") {
    return new Response(getHtml(), {
      headers: { "Content-Type": "text/html;charset=utf-8" },
    });
  }

  if (request.method === "POST" && url.pathname === "/api/send") {
    try {
      const { carNo, userCode, code, content } = await request.json();

      if (code !== userCode) {
        return Response.json({ success: false, msg: "验证码错误" });
      }

      const WEBHOOK = env.WECOM_WEBHOOK;
      if (!WEBHOOK) {
        return Response.json({ success: false, msg: "未配置 WECOM_WEBHOOK" });
      }

      const defaultMsg = "📞 便捷联络\n车牌号：" + carNo + "\n请及时沟通，感谢配合";
      const sendContent = content?.trim()
        ? `📞 便捷联络\n车牌号：${carNo}\n留言：${content}`
        : defaultMsg;

      const res = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          msgtype: "text",
          text: { content: sendContent }
        })
      });

      const data = await res.json();

      return Response.json({
        success: data.errcode === 0,
        msg: data.errmsg
      });
    } catch (e) {
      return Response.json({ success: false, error: e.toString() });
    }
  }

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
<title>便捷联络</title>
<link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f2f5fa;padding:20px;font-family:-apple-system,BlinkMacSystemFont,Roboto,sans-serif}

/* 顶部通知 */
#notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translate(-50%, -120%);
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  opacity: 0;
  transition: all 0.3s ease;
  z-index: 1000;
  max-width: 320px;
  width: 90%;
  border: 1px solid #eee;
}
#notification.show {
  transform: translate(-50%, 0);
  opacity: 1;
}
#notification i {
  font-size: 28px;
  margin-right: 12px;
  flex-shrink: 0;
}
#notification .text {
  font-size: 16px;
  font-weight: 500;
  line-height: 1.4;
}
#notification.success i {
  color: #20C997;
}
#notification.error i {
  color: #DC3545;
}

.container{max-width:380px;margin:50px auto}
.card{background:#fff;border-radius:20px;box-shadow:0 8px 30px rgba(0,0,0,0.08);padding:32px 24px}
.title{text-align:center;font-size:22px;font-weight:700;color:#222;margin-bottom:6px}
.subtitle{text-align:center;font-size:14px;color:#666;margin-bottom:28px}
.form-item{margin-bottom:16px}
.form-item label{display:block;font-size:14px;color:#333;margin-bottom:6px;font-weight:500}
.form-item input,.form-item select{
  width:100%;height:48px;border:1px solid #e1e4e8;
  border-radius:12px;padding:0 16px;font-size:16px;outline:none
}
.code-row{display:flex;gap:12px}
#codeCanvas{width:120px;height:48px;border-radius:12px;background:#f5f7fa;cursor:pointer}
.btn{width:100%;height:52px;border-radius:14px;font-size:16px;font-weight:600;border:none;margin-bottom:12px}
.btn-call{background:#007AFF;color:#fff}
.btn-notify{background:#34C759;color:#fff}
.tip{text-align:center;font-size:12px;color:#999;margin-top:16px}
</style>
</head>
<body>

<div id="notification">
  <i id="notifyIcon"></i>
  <div id="notifyText" class="text"></div>
</div>

<div class="container">
  <div class="card">
    <div class="title">便捷联络</div>
    <div class="subtitle">扫码联系车主，保护隐私</div>

    <div class="form-item">
      <label>车牌号</label>
      <select id="carNo">
        <option value="闽A12345">测试12345</option>
      </select>
    </div>

    <div class="form-item">
      <label>留言（可选）</label>
      <input type="text" id="content" placeholder="挪车通知！谢谢！">
    </div>

    <div class="form-item">
      <label>验证码</label>
      <div class="code-row">
        <input type="text" id="codeInput" maxlength="4">
        <canvas id="codeCanvas"></canvas>
      </div>
    </div>

    <button class="btn btn-call" onclick="call()">一键拨打车主电话</button>
    <button class="btn btn-notify" onclick="sendNotify()">一键微信通知车主</button>
    <div class="tip">仅用于联络，隐私保护</div>
  </div>
</div>

<script>
let validateCode = "";

// 顶部通知
function showNotify(type, text) {
  const el = document.getElementById('notification');
  const icon = document.getElementById('notifyIcon');
  const textEl = document.getElementById('notifyText');

  el.classList.remove('success', 'error');
  el.classList.add(type);
  textEl.textContent = text;

  if (type === 'success') {
    icon.className = 'fa-solid fa-circle-check';
  } else {
    icon.className = 'fa-solid fa-circle-xmark';
  }

  el.classList.add('show');
  setTimeout(() => {
    el.classList.remove('show');
  }, 3000);
}

function genCode() {
  const canvas = document.getElementById("codeCanvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 120; canvas.height = 48;
  const chars = "0123456789ABCDEFGHJKLMNPQRSTWXYZ";
  validateCode = Array(4).fill(0).map(()=>chars[Math.floor(Math.random()*chars.length)]).join('');
  ctx.fillStyle="#f5f7fa"; ctx.fillRect(0,0,120,48);
  ctx.font="bold 26px Arial"; ctx.fillStyle="#007AFF";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(validateCode,60,24);
}

async function call() {
  const res=await fetch('/api/call',{method:'POST'});
  const data=await res.json();
  if(data.success&&data.phone) {
    location.href='tel:'+data.phone;
  } else {
    showNotify('error','获取号码失败');
  }
}

async function sendNotify() {
  const carNo = document.getElementById('carNo').value;
  const content = document.getElementById('content').value.trim();
  const userCode = document.getElementById('codeInput').value.trim().toUpperCase();

  if(!userCode){
    showNotify('error','请输入验证码');
    return;
  }

  const r=await fetch('/api/send',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ carNo, userCode, code:validateCode, content })
  });
  const d=await r.json();
  
  if(d.success) {
    showNotify('success','发送成功');
  } else {
    showNotify('error','失败：'+d.msg);
  }
  genCode();
}

window.onload=()=>{
  genCode();
  document.getElementById('codeCanvas').onclick=genCode;
}
</script>
</body>
</html>`;
}