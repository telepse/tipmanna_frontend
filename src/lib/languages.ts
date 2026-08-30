const languageListData = [
  "en-GB",
  "es-ES",
  "fr-FR",
  "de-DE",
  "it-IT",
  "pt-PT",
  "ru-RU",
  "zh-CN",
  "ja-JP",
  "ko-KR",
  "ar-SA",
  "hi-IN",
  "bn-BD",
  "pa-IN",
  "ta-IN",
  "te-IN",
  "mr-IN",
  "ur-IN",
  "fa-IR",
  "he-IL",
  "vi-VN",
  "th-TH",
];

export const ALL_LANGUAGES = languageListData.map((language: string) => ({
  name: language,
}));
