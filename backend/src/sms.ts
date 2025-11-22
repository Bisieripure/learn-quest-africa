export function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  // Mock implementation for Africa's Talking SMS service
  console.log(`Sending SMS to ${phoneNumber}: ${message}`);
  // In a real implementation, this would call Africa's Talking API
  // For demo purposes, always return success
  return Promise.resolve(true);
}
