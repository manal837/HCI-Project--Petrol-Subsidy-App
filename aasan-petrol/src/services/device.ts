import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Speech from "expo-speech";

const VOICE_ENABLED_KEY = "@aasan_petrol_voice_enabled";

export async function getVoiceEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(VOICE_ENABLED_KEY);
    return val !== null ? JSON.parse(val) : true;
  } catch {
    return true;
  }
}

export async function setVoiceEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(VOICE_ENABLED_KEY, JSON.stringify(enabled));
  } catch (e) {
    console.warn("Voice storage error:", e);
  }
}

export function speakUrdu(text: string) {
  if (Platform.OS === "web" && typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;

    const voices = window.speechSynthesis.getVoices();
    
    // Priority 1: Exact Urdu Voice
    // Priority 2: Regional Phonetic Fallback (Hindi/Arabic)
    // Priority 3: Default System Voice
    const urVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().includes("ur") ||
        v.lang.toLowerCase().includes("pk") ||
        v.name.toLowerCase().includes("urdu") ||
        v.lang.toLowerCase().includes("hi") ||
        v.lang.toLowerCase().includes("ar")
    );

    if (urVoice) {
      utterance.voice = urVoice;
      utterance.lang = urVoice.lang;
    } else {
      utterance.lang = "en-US";
    }

    window.speechSynthesis.speak(utterance);
    return;
  }

  try {
    Speech.stop();
    Speech.speak(text, { language: "ur-PK", rate: 0.85 });
  } catch (e) {
    console.warn("Urdu speech playback error:", e);
  }
}

export function speakEnglish(text: string) {
  if (Platform.OS === "web" && typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
    return;
  }

  try {
    Speech.stop();
    Speech.speak(text, { language: "en-US", rate: 0.85 });
  } catch (e) {
    console.warn("English speech playback error:", e);
  }
}

