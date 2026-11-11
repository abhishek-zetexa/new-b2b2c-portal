const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,10}$/;
const websitePattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/i;

export function requiredText(value: string, message: string) {
  return value.trim() ? "" : message;
}

export function emailError(value: string) {
  const email = value.trim();
  if (!email) return "Enter your email address.";
  if (!emailPattern.test(email.toLowerCase())) return "Enter a valid email, like name@company.com.";
  return "";
}

export function nationalDigits(value: string, dialCode = "") {
  const digits = value.replace(/\D/g, "");
  const code = dialCode.replace(/\D/g, "");
  if (code && digits.startsWith(code)) return digits.slice(code.length);
  return digits;
}

export function phoneError(value: string, dialCode = "") {
  const digits = nationalDigits(value, dialCode);
  if (!digits) return "Enter your mobile number.";
  if (digits.length < 6 || digits.length > 15) return "Use 6 to 15 digits, without the country code.";
  return "";
}

export function optionalPhoneError(value: string, dialCode = "") {
  if (!nationalDigits(value, dialCode)) return "";
  return phoneError(value, dialCode);
}

export function websiteError(value: string) {
  const site = value.trim();
  if (!site) return "";
  if (!websitePattern.test(site)) return "Enter a valid website, like www.example.com.";
  return "";
}

export function otpError(value: string) {
  if (!value) return "Enter the 6-digit code from your email.";
  if (!/^\d{6}$/.test(value)) return "The code must be 6 digits.";
  return "";
}

export function firstIssue(issues: Record<string, string>) {
  return Object.keys(issues).find((key) => issues[key]) ?? "";
}

export function focusIssue(id: string) {
  if (!id) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.getElementById(id)?.focus();
    });
  });
}
