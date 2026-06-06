function encodeToFormData(payload) {
  const formEncodedData = new URLSearchParams(payload).toString();
  return formEncodedData;
}
module.exports = encodeToFormData;
