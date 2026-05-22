import { messagingApi } from '@line/bot-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

export async function sendStatusUpdateFlex(invoiceId: string, status: string) {
  try {
    // 1. ดึงข้อมูลบิล และลูกบ้านที่อยู่ในบ้านหลังนี้แบบโค้ดเก่าของคุณเลย
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { 
        house: { 
          include: { 
            residents: true, 
            owner: true      
          } 
        } 
      }
    });

    const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });

    if (!invoice) {
      console.error('❌ ไม่พบบิลสำหรับส่งแจ้งเตือน');
      return;
    }

    // 2. หาว่าต้องส่ง LINE ไปให้ใครบ้าง (อิงตามโค้ดสุดเจ๋งของคุณ)
    const targetLineIds: string[] = [];
    invoice.house.residents.forEach(user => {
      if (user.lineId) targetLineIds.push(user.lineId);
    });
    if (invoice.house.owner?.lineId) {
      targetLineIds.push(invoice.house.owner.lineId);
    }
    const uniqueLineIds = [...new Set(targetLineIds)];

    if (uniqueLineIds.length === 0) {
      console.log('⚠️ ไม่มีลูกบ้านที่ผูก LINE ในบ้านหลังนี้');
      return;
    }

    // 3. 🌟 จัดการ สี และ ข้อความ ตามสถานะ (Status)
    let headerText = 'แจ้งเตือนค่าส่วนกลาง';
    let headerColor = '#376B64'; // เขียวหลัก
    let statusText = 'รอชำระ';

    switch (status) {
      case 'PAID':
        headerText = '✅ รับชำระเงินเรียบร้อย';
        headerColor = '#1DB446'; // เขียว LINE
        statusText = 'ชำระแล้ว';
        break;
      case 'CHECKING':
        headerText = '⏳ ได้รับสลิปแล้ว รอตรวจสอบ';
        headerColor = '#D97706'; // ส้มเหลือง
        statusText = 'รอแอดมินตรวจสอบ';
        break;
      case 'REJECTED':
        headerText = '❌ สลิปไม่ถูกต้อง';
        headerColor = '#E63946'; // แดง
        statusText = 'กรุณาส่งสลิปใหม่';
        break;
      case 'OVERDUE':
        headerText = '⚠️ แจ้งเตือนค้างชำระ';
        headerColor = '#E63946'; // แดง
        statusText = 'เกินกำหนดชำระ';
        break;
    }

    // 4. สร้าง Flex Message (ใช้ Layout กว้างแบบ giga ตามโค้ดเก่าของคุณ)
    const flexMessage: messagingApi.FlexMessage = {
      type: 'flex',
      altText: headerText,
      contents: {
        type: "bubble",
        size: "giga", 
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: headerText,
              weight: "bold",
              color: headerColor,
              size: "md"
            },
            {
              type: "text",
              text: `บ้านเลขที่ ${invoice.house.houseNo}`,
              weight: "bold",
              size: "xxl",
              margin: "md",
              color: "#333333"
            },
            {
              type: "text",
              text: `ประจำเดือน ${invoice.billingMonth}/${invoice.billingYear + 543}`,
              size: "xs",
              color: "#aaaaaa",
              wrap: true
            },
            { type: "separator", margin: "xxl" },
            {
              type: "box",
              layout: "vertical",
              margin: "xxl",
              spacing: "sm",
              contents: [
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "สถานะ", size: "sm", color: "#555555", flex: 4 },
                    { type: "text", text: statusText, size: "sm", color: headerColor, align: "end", weight: "bold", flex: 3 }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "ขนาดพื้นที่", size: "sm", color: "#555555", flex: 4 },
                    { type: "text", text: `${invoice.house.houseSize} ตร.ว.`, size: "sm", color: "#111111", align: "end", flex: 3 }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "ยอดสุทธิ", size: "sm", color: "#555555", flex: 4 },
                    { type: "text", text: `${(invoice.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "md", color: "#111111", align: "end", weight: "bold", flex: 3 }
                  ]
                }
              ]
            }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "primary",
              color: headerColor, // เปลี่ยนสีปุ่มตามสถานะ
              height: "md",
              action: {
                type: "uri",
                label: "ดูรายละเอียด",
                uri: `https://liff.line.me/2009290251-UZlxLIQJ` // LIFF ID ของคุณ
              }
            },
            {
              type: "box",
              layout: "horizontal",
              margin: "md",
              contents: [
                { type: "text", text: "INVOICE ID", size: "xxxxs", color: "#aaaaaa", flex: 1 },
                { type: "text", text: invoice.invoiceNo, size: "xxxxs", color: "#aaaaaa", align: "end", flex: 2 }
              ]
            }
          ]
        },
        styles: {
          footer: { separator: true }
        }
      }
    };

    // 5. ส่งข้อความเข้า LINE
    for (const lineId of uniqueLineIds) {
      await client.pushMessage({
        to: lineId,
        messages: [flexMessage]
      });
      console.log(`✅ ส่ง Flex Message ให้ ${lineId} สำเร็จ (สถานะ: ${status})`);
    }

  } catch (error) {
    console.error("❌ LINE Notify Error:", error);
  }
}