export async function sendLineBroadcast(title: string, content: string, category: string) {
  const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  
  if (!LINE_ACCESS_TOKEN) {
    console.error("❌ ไม่พบ LINE_CHANNEL_ACCESS_TOKEN ในไฟล์ .env");
    return false;
  }

  // รูปแบบข้อความที่จะส่งไปใน LINE
  const messagePayload = {
    messages: [
      {
        type: "text",
        text: `📢 ประกาศหมู่บ้าน: ${title}\n📍 หมวดหมู่: ${category}\n\n${content}`
      }
    ]
  };

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
      },
      body: JSON.stringify(messagePayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ ยิง LINE ไม่สำเร็จ:", errorData);
      return false;
    }

    console.log("✅ ยิง LINE Broadcast สำเร็จ!");
    return true;
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการยิง LINE:", error);
    return false;
  }
}