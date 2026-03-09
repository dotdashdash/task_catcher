/**
 * 脱敏工具函数
 * 使用正则表达式将文本中的敏感信息（如邮箱、手机号/电话号、金额）替换为安全的脱敏标记。
 */
export function maskSensitiveData(text: string): string {
    if (!text) return text;

    let maskedText = text;

    // 1. 脱敏邮箱地址
    // 匹配标准邮箱格式：example@domain.com 等
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    maskedText = maskedText.replace(emailRegex, '[EMAIL]');

    // 2. 脱敏手机号/常见电话格式
    // 简单匹配：11位连续数字（如 13812345678）或加上常见分隔符（138-1234-5678 / 138 1234 5678）
    // 对于海外电话等更复杂场景 MVP 可先使用简单的正则，后续迭代
    const phoneRegex = /(?:\+?86)?\b1[3-9]\d{9}\b|\b\d{3}[-.\s]?\d{4}[-.\s]?\d{4}\b/g;
    maskedText = maskedText.replace(phoneRegex, '[PHONE_NUMBER]');

    // 3. 脱敏金额
    // 匹配以人民币、美元等货币符号打头的数字（例如 ¥1000.50, $20），或跟随“元/块/美元”等单位的数字
    const amountRegex = /([¥$￥]\s*\d+(?:\.\d+)?)|(\b\d+(?:\.\d+)?\s*(?:元|块|人民币|美元))/g;
    maskedText = maskedText.replace(amountRegex, '[AMOUNT]');

    return maskedText;
}
