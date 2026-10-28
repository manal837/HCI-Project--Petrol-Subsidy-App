import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { speakUrdu, speakEnglish } from "../services/device";
import { signUpUser, loginWithPhonePin } from "../services/auth";

type Language = "en" | "ur";
const LANG_STORAGE_KEY = "@aasan_petrol_language";

function speakGuidance(textEn: string, textUr: string, currentLang: Language) {
  if (currentLang === "ur") {
    speakUrdu(textUr);
  } else {
    speakEnglish(textEn);
  }
}

export function WelcomeScreen({
  onLogin,
  onRegister,
}: {
  onLogin: () => void;
  onRegister: () => void;
}) {
  const [lang, setLang] = useState<Language>("ur");

  useEffect(() => {
    AsyncStorage.getItem(LANG_STORAGE_KEY).then((saved) => {
      if (saved === "en" || saved === "ur") setLang(saved);
    });
  }, []);

  const switchLanguage = (newLang: Language) => {
    setLang(newLang);
    AsyncStorage.setItem(LANG_STORAGE_KEY, newLang);
  };

  const isUrdu = lang === "ur";

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.langToggle}>
          <TouchableOpacity
            style={[styles.langBtn, lang === "en" && styles.langBtnActive]}
            onPress={() => switchLanguage("en")}
          >
            <Text style={[styles.langText, lang === "en" && styles.langTextActive]}>English</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, lang === "ur" && styles.langBtnActive]}
            onPress={() => switchLanguage("ur")}
          >
            <Text style={[styles.langText, lang === "ur" && styles.langTextActive]}>اردو</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.heroBox}>
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 36 }}>⛽</Text>
        </View>
        <Text style={styles.title}>AASAN PETROL</Text>
        <Text style={[styles.subtitle, isUrdu && styles.textRight]}>
          {isUrdu ? "صوتی اور تصویری پٹرول والٹ" : "Voice & Image Guided Fuel Wallet"}
        </Text>
      </View>

      <TouchableOpacity style={styles.btnPrimary} onPress={onRegister} activeOpacity={0.85}>
        <Text style={styles.btnPrimaryText}>
          {isUrdu ? "نیا اکاؤنٹ بنائیں" : "CREATE NEW ACCOUNT"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnSecondary} onPress={onLogin} activeOpacity={0.85}>
        <Text style={styles.btnSecondaryText}>
          {isUrdu ? "پہلے سے اکاؤنٹ موجود ہے؟ لاگ ان" : "EXISTING ACCOUNT? LOGIN"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function LoginScreen({
  onBack,
  onPinSuccess,
}: {
  onBack: () => void;
  onPinSuccess: () => void;
  [key: string]: any;
}) {
  const [lang, setLang] = useState<Language>("ur");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LANG_STORAGE_KEY).then((saved) => {
      if (saved === "en" || saved === "ur") setLang(saved);
    });
  }, []);

  const switchLanguage = (newLang: Language) => {
    setLang(newLang);
    AsyncStorage.setItem(LANG_STORAGE_KEY, newLang);
  };

  const isUrdu = lang === "ur";

  const handleLogin = async () => {
    if (phone.trim().length < 10) {
      Alert.alert(
        isUrdu ? "معلومات" : "Login Error",
        isUrdu ? "برائے مہربانی اپنا درست موبائل نمبر درج کریں۔" : "Please enter your valid phone number."
      );
      return;
    }
    if (pin.length !== 6) {
      Alert.alert(
        isUrdu ? "معلومات" : "PIN Error",
        isUrdu ? "براہ کرم 6 ہندسوں کا پن کوڈ درج کریں۔" : "Please enter your full 6-digit PIN."
      );
      return;
    }

    setLoading(true);
    const res = await loginWithPhonePin(phone, pin);
    setLoading(false);

    if (res.error) {
      Alert.alert(
        isUrdu ? "لاگ ان ناکام" : "Login Failed",
        isUrdu ? "موبائل نمبر یا پن کوڈ غلط ہے۔" : "Invalid phone number or PIN code."
      );
      return;
    }

    onPinSuccess();
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← {isUrdu ? "واپس" : "Back"}</Text>
        </TouchableOpacity>

        <View style={styles.langToggle}>
          <TouchableOpacity
            style={[styles.langBtn, lang === "en" && styles.langBtnActive]}
            onPress={() => switchLanguage("en")}
          >
            <Text style={[styles.langText, lang === "en" && styles.langTextActive]}>English</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, lang === "ur" && styles.langBtnActive]}
            onPress={() => switchLanguage("ur")}
          >
            <Text style={[styles.langText, lang === "ur" && styles.langTextActive]}>اردو</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.title, isUrdu && styles.textRight]}>
        {isUrdu ? "لاگ ان کریں" : "Driver Login"}
      </Text>

      <View style={styles.fieldBlock}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.fieldLabel, isUrdu && styles.textRight]}>
            {isUrdu ? "موبائل نمبر *" : "MOBILE NUMBER *"}
          </Text>
          <TouchableOpacity
            style={styles.speakerBtn}
            onPress={() => speakGuidance("Enter your mobile number", "اپنا موبائل نمبر درج کریں", lang)}
          >
            <Text style={{ fontSize: 16 }}>🔊</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          nativeID="phone"
          aria-label="Mobile Number"
          style={[styles.textInput, isUrdu && styles.textRight]}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="03001234567"
          placeholderTextColor="#64748B"
        />
      </View>

      <View style={styles.fieldBlock}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.fieldLabel, isUrdu && styles.textRight]}>
            {isUrdu ? "6 ہندسوں کا پن کوڈ *" : "SECURITY PIN *"}
          </Text>
          <TouchableOpacity
            style={styles.speakerBtn}
            onPress={() =>
              speakGuidance("Enter your secret six digit PIN code", "اپنا چھ ہندسوں کا خفیہ پن کوڈ لکھیں", lang)
            }
          >
            <Text style={{ fontSize: 16 }}>🔊</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          nativeID="pin"
          aria-label="Security PIN"
          style={[styles.textInput, { letterSpacing: 8, textAlign: "center", fontSize: 20 }]}
          value={pin}
          onChangeText={setPin}
          keyboardType="numeric"
          secureTextEntry
          maxLength={6}
          placeholder="******"
          placeholderTextColor="#64748B"
        />
      </View>

      <TouchableOpacity
        style={styles.btnPrimary}
        onPress={handleLogin}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#0F172A" />
        ) : (
          <Text style={styles.btnPrimaryText}>{isUrdu ? "لاگ ان کریں" : "LOGIN"}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export function RegisterScreen({
  onBack,
  onDone,
}: {
  onBack: () => void;
  onDone: (email: string, required: boolean) => void;
}) {
  const [lang, setLang] = useState<Language>("ur");
  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [registration, setRegistration] = useState("");
  const [makeModel, setMakeModel] = useState("");
  const [vehicleType, setVehicleType] = useState<"bike" | "car" | "rickshaw" | "van" | "truck">("car");
  const [fuelType, setFuelType] = useState<"petrol" | "diesel" | "cng">("petrol");

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LANG_STORAGE_KEY).then((saved) => {
      if (saved === "en" || saved === "ur") setLang(saved);
    });
  }, []);

  const switchLanguage = (newLang: Language) => {
    setLang(newLang);
    AsyncStorage.setItem(LANG_STORAGE_KEY, newLang);
  };

  const isUrdu = lang === "ur";

  const vehicleOptions = [
    { type: "bike", labelEn: "BIKE", labelUr: "بائیک", icon: "🏍️" },
    { type: "car", labelEn: "CAR", labelUr: "کار", icon: "🚗" },
    { type: "rickshaw", labelEn: "RICKSHAW", labelUr: "رکشہ", icon: "🛺" },
    { type: "van", labelEn: "VAN", labelUr: "وین", icon: "🚐" },
    { type: "truck", labelEn: "TRUCK", labelUr: "ٹرک", icon: "🚚" },
  ] as const;

  const handleNextStep = () => {
    const cleanPhone = phone.trim().replace(/\s+/g, "");
    if (!name.trim()) {
      Alert.alert(
        isUrdu ? "معلومات" : "Required Field",
        isUrdu ? "برائے مہربانی اپنا پورا نام درج کریں۔" : "Please enter your full name."
      );
      return;
    }
    if (cleanPhone.length < 10) {
      Alert.alert(
        isUrdu ? "معلومات" : "Required Field",
        isUrdu ? "برائے مہربانی درست موبائل نمبر درج کریں۔" : "Please enter a valid mobile number."
      );
      return;
    }
    if (!registration.trim()) {
      Alert.alert(
        isUrdu ? "معلومات" : "Required Field",
        isUrdu ? "برائے مہربانی گاڑی کا نمبر پلیٹ درج کریں۔" : "Please enter your vehicle registration number."
      );
      return;
    }

    setStep(2);
    speakGuidance(
      "Choose a six digit PIN code and confirm it",
      "چھ ہندسوں کا پن کوڈ بنائیں اور اس کی تصدیق کریں",
      lang
    );
  };

  const handleSignUpSubmit = async () => {
    if (pin.length !== 6) {
      Alert.alert(
        isUrdu ? "غلط پن" : "Invalid PIN",
        isUrdu ? "پن کوڈ لازمی 6 ہندسوں کا ہونا چاہیے۔" : "PIN code must be exactly 6 digits."
      );
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert(
        isUrdu ? "عدم مطابقت" : "PIN Mismatch",
        isUrdu ? "درج کردہ دونوں پن کوڈ ایک جیسے ہونا ضروری ہیں۔" : "The entered PINs do not match."
      );
      return;
    }

    setLoading(true);
    const cleanPhone = phone.trim().replace(/\s+/g, "");

    const res = await signUpUser(
      cleanPhone,
      name,
      pin,
      cnic,
      registration,
      makeModel,
      vehicleType,
      fuelType,
      "driver"
    );
    setLoading(false);

    if (res.error && !res.profile) {
      Alert.alert(isUrdu ? "اطلاع" : "Notice", res.error);
      return;
    }

    onDone(`${cleanPhone}@aasanpetrol.local`, false);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={step === 2 ? () => setStep(1) : onBack}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>← {isUrdu ? "واپس" : "Back"}</Text>
        </TouchableOpacity>

        <View style={styles.langToggle}>
          <TouchableOpacity
            style={[styles.langBtn, lang === "en" && styles.langBtnActive]}
            onPress={() => switchLanguage("en")}
          >
            <Text style={[styles.langText, lang === "en" && styles.langTextActive]}>English</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, lang === "ur" && styles.langBtnActive]}
            onPress={() => switchLanguage("ur")}
          >
            <Text style={[styles.langText, lang === "ur" && styles.langTextActive]}>اردو</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.title, isUrdu && styles.textRight]}>
        {isUrdu ? "نیا اکاؤنٹ اور گاڑی کا اندراج" : "Driver Registration"}
      </Text>
      <Text style={[styles.stepBadge, isUrdu && styles.textRight]}>
        {isUrdu ? `مرحلہ ${step} / 2` : `STEP ${step} OF 2`}
      </Text>

      {step === 1 ? (
        <View style={styles.formCard}>
          <View style={styles.fieldBlock}>
            <View style={styles.fieldHeader}>
              <Text style={[styles.fieldLabel, isUrdu && styles.textRight]}>
                {isUrdu ? "پورا نام *" : "FULL NAME *"}
              </Text>
              <TouchableOpacity
                style={styles.speakerBtn}
                onPress={() => speakGuidance("Type your full name", "اپنا پورا نام لکھیں", lang)}
              >
                <Text style={{ fontSize: 16 }}>🔊</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              nativeID="fullname"
              aria-label="Full Name"
              style={[styles.textInput, isUrdu && styles.textRight]}
              placeholder={isUrdu ? "مثال: طارق محمود" : "e.g. Tariq Mahmood"}
              placeholderTextColor="#64748B"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.fieldBlock}>
            <View style={styles.fieldHeader}>
              <Text style={[styles.fieldLabel, isUrdu && styles.textRight]}>
                {isUrdu ? "موبائل نمبر *" : "MOBILE NUMBER *"}
              </Text>
              <TouchableOpacity
                style={styles.speakerBtn}
                onPress={() =>
                  speakGuidance("Enter your 11 digit mobile number", "اپنا 11 ہندسوں کا موبائل نمبر لکھیں", lang)
                }
              >
                <Text style={{ fontSize: 16 }}>🔊</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              nativeID="reg_phone"
              aria-label="Mobile Number"
              style={[styles.textInput, isUrdu && styles.textRight]}
              placeholder="03001234567"
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View style={styles.fieldBlock}>
            <View style={styles.fieldHeader}>
              <Text style={[styles.fieldLabel, isUrdu && styles.textRight]}>
                {isUrdu ? "شناختی کارڈ نمبر (13 ہندسے)" : "CNIC NUMBER (13 DIGITS)"}
              </Text>
              <TouchableOpacity
                style={styles.speakerBtn}
                onPress={() =>
                  speakGuidance(
                    "Enter your 13 digit identity number without dashes",
                    "شناختی کارڈ نمبر بغیر ڈیش کے لکھیں",
                    lang
                  )
                }
              >
                <Text style={{ fontSize: 16 }}>🔊</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              nativeID="cnic"
              aria-label="CNIC Number"
              style={[styles.textInput, isUrdu && styles.textRight]}
              placeholder="4210112345671"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              maxLength={13}
              value={cnic}
              onChangeText={setCnic}
            />
          </View>

          <View style={styles.fieldBlock}>
            <View style={styles.fieldHeader}>
              <Text style={[styles.fieldLabel, isUrdu && styles.textRight]}>
                {isUrdu ? "کمپنی کا نام" : "COMPANY NAME"}
              </Text>
              <TouchableOpacity
                style={styles.speakerBtn}
                onPress={() => speakGuidance("Enter your company name", "اپنی کمپنی کا نام لکھیں", lang)}
              >
                <Text style={{ fontSize: 16 }}>🔊</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              nativeID="company"
              aria-label="Company Name"
              style={[styles.textInput, isUrdu && styles.textRight]}
              placeholder={isUrdu ? "مثال: UBL / Securiti.ai" : "e.g. UBL / Securiti.ai"}
              placeholderTextColor="#64748B"
              value={companyName}
              onChangeText={setCompanyName}
            />
          </View>

          <View style={styles.fieldBlock}>
            <View style={styles.fieldHeader}>
              <Text style={[styles.fieldLabel, isUrdu && styles.textRight]}>
                {isUrdu ? "ملازم کا کارڈ / ID نمبر" : "EMPLOYEE ID NUMBER"}
              </Text>
              <TouchableOpacity
                style={styles.speakerBtn}
                onPress={() => speakGuidance("Enter employee ID number", "اپنا ایمپلائی آئی ڈی لکھیں", lang)}
              >
                <Text style={{ fontSize: 16 }}>🔊</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              nativeID="employee_id"
              aria-label="Employee ID"
              style={[styles.textInput, isUrdu && styles.textRight]}
              placeholder="EMP-9921"
              placeholderTextColor="#64748B"
              value={employeeId}
              onChangeText={setEmployeeId}
            />
          </View>

          <View style={styles.fieldBlock}>
            <View style={styles.fieldHeader}>
              <Text style={[styles.fieldLabel, isUrdu && styles.textRight]}>
                {isUrdu ? "گاڑی کا نمبر پلیٹ *" : "VEHICLE NUMBER PLATE *"}
              </Text>
              <TouchableOpacity
                style={styles.speakerBtn}
                onPress={() =>
                  speakGuidance("Enter your vehicle registration plate number", "اپنی گاڑی کا نمبر پلیٹ درج کریں", lang)
                }
              >
                <Text style={{ fontSize: 16 }}>🔊</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              nativeID="registration"
              aria-label="Vehicle Number Plate"
              style={[styles.textInput, isUrdu && styles.textRight]}
              placeholder={isUrdu ? "مثال: KHI-1234" : "e.g. KHI-1234"}
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
              value={registration}
              onChangeText={setRegistration}
            />
          </View>

          <View style={styles.fieldBlock}>
            <View style={styles.fieldHeader}>
              <Text style={[styles.fieldLabel, isUrdu && styles.textRight]}>
                {isUrdu ? "گاڑی کا ماڈل" : "MAKE & MODEL"}
              </Text>
              <TouchableOpacity
                style={styles.speakerBtn}
                onPress={() =>
                  speakGuidance("Enter vehicle model like Honda CD70", "گاڑی کا ماڈل درج کریں جیسے ہونڈا CD70", lang)
                }
              >
                <Text style={{ fontSize: 16 }}>🔊</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              nativeID="makeModel"
              aria-label="Vehicle Model"
              style={[styles.textInput, isUrdu && styles.textRight]}
              placeholder={isUrdu ? "مثال: ہونڈا CD70 / ٹویوٹا کرولا" : "e.g. Honda CD70 / Toyota Corolla"}
              placeholderTextColor="#64748B"
              value={makeModel}
              onChangeText={setMakeModel}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, isUrdu && styles.textRight]}>
              {isUrdu ? "گاڑی کی قسم (تصویر کے ساتھ)" : "VEHICLE TYPE (WITH PICTURES)"}
            </Text>
            <View style={styles.visualGrid}>
              {vehicleOptions.map((v) => (
                <TouchableOpacity
                  key={v.type}
                  style={[styles.visualCard, vehicleType === v.type && styles.visualCardActive]}
                  onPress={() => {
                    setVehicleType(v.type as any);
                    speakGuidance(`Selected ${v.labelEn}`, `${v.labelUr} منتخب کیا گیا ہے`, lang);
                  }}
                >
                  <Text style={{ fontSize: 32 }}>{v.icon}</Text>
                  <Text style={[styles.visualCardText, vehicleType === v.type && styles.visualCardTextActive]}>
                    {isUrdu ? v.labelUr : v.labelEn}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, isUrdu && styles.textRight]}>
              {isUrdu ? "پٹرول یا ایندھن کی قسم" : "FUEL TYPE"}
            </Text>
            <View style={styles.pillRow}>
              {(["petrol", "diesel", "cng"] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.pill, fuelType === f && styles.pillActive]}
                  onPress={() => setFuelType(f)}
                >
                  <Text style={[styles.pillText, fuelType === f && styles.pillTextActive]}>
                    {f.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleNextStep} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>{isUrdu ? "آگے بڑھیں →" : "NEXT STEP →"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.formCard}>
          <View style={styles.fieldBlock}>
            <View style={styles.fieldHeader}>
              <Text style={[styles.fieldLabel, isUrdu && styles.textRight]}>
                {isUrdu ? "6 ہندسوں کا پن کوڈ منتخب کریں *" : "CHOOSE 6-DIGIT PIN *"}
              </Text>
              <TouchableOpacity
                style={styles.speakerBtn}
                onPress={() =>
                  speakGuidance("Choose a secret six digit PIN code", "اپنا چھ ہندسوں کا خفیہ پن کوڈ بنائیں", lang)
                }
              >
                <Text style={{ fontSize: 16 }}>🔊</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              nativeID="reg_pin"
              aria-label="Choose 6 Digit PIN"
              style={[styles.textInput, { letterSpacing: 8, textAlign: "center", fontSize: 20 }]}
              placeholder="******"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
              value={pin}
              onChangeText={setPin}
            />
          </View>

          <View style={styles.fieldBlock}>
            <View style={styles.fieldHeader}>
              <Text style={[styles.fieldLabel, isUrdu && styles.textRight]}>
                {isUrdu ? "پن کوڈ کی تصدیق کریں *" : "CONFIRM 6-DIGIT PIN *"}
              </Text>
              <TouchableOpacity
                style={styles.speakerBtn}
                onPress={() =>
                  speakGuidance("Type the six digit PIN code again to confirm", "تصدیق کے لیے وہی چھ ہندسوں کا پن کوڈ دوبارہ درج کریں", lang)
                }
              >
                <Text style={{ fontSize: 16 }}>🔊</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              nativeID="confirm_pin"
              aria-label="Confirm 6 Digit PIN"
              style={[styles.textInput, { letterSpacing: 8, textAlign: "center", fontSize: 20 }]}
              placeholder="******"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
              value={confirmPin}
              onChangeText={setConfirmPin}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.btnSecondary, { flex: 1 }]}
              onPress={() => setStep(1)}
              activeOpacity={0.85}
            >
              <Text style={styles.btnSecondaryText}>{isUrdu ? "واپس" : "BACK"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnPrimary, { flex: 2 }]}
              onPress={handleSignUpSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <Text style={styles.btnPrimaryText}>{isUrdu ? "اکاؤنٹ بنائیں" : "CREATE ACCOUNT"}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

export function ConfirmationScreen({ onLogin }: { onLogin: () => void; [key: string]: any }) {
  const [lang, setLang] = useState<Language>("ur");

  useEffect(() => {
    AsyncStorage.getItem(LANG_STORAGE_KEY).then((saved) => {
      if (saved === "en" || saved === "ur") setLang(saved);
    });
  }, []);

  const isUrdu = lang === "ur";

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isUrdu && styles.textRight]}>
        {isUrdu ? "مبارک ہو! اکاؤنٹ بن گیا" : "Account Created Successfully"}
      </Text>
      <Text style={[styles.subtitle, isUrdu && styles.textRight]}>
        {isUrdu ? "آپ کا اکاؤنٹ تیار ہے۔ اب پن کوڈ کے ذریعے لاگ ان کریں۔" : "Your account is ready. Please log in using your PIN."}
      </Text>

      <TouchableOpacity style={styles.btnPrimary} onPress={onLogin} activeOpacity={0.85}>
        <Text style={styles.btnPrimaryText}>{isUrdu ? "لاگ ان اسکرین پر جائیں" : "GO TO LOGIN"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    padding: 24,
    justifyContent: "center",
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#1A1A1A",
    padding: 20,
    paddingTop: 40,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backBtnText: {
    color: "#F59E0B",
    fontWeight: "bold",
    fontSize: 14,
  },
  langToggle: {
    flexDirection: "row",
    backgroundColor: "#0F172A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 3,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  langBtnActive: {
    backgroundColor: "#F59E0B",
  },
  langText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
  },
  langTextActive: {
    color: "#0F172A",
  },
  heroBox: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 2,
    borderColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#F59E0B",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginBottom: 20,
  },
  stepBadge: {
    fontSize: 11,
    fontWeight: "900",
    color: "#F59E0B",
    letterSpacing: 1,
    marginBottom: 12,
  },
  textRight: {
    textAlign: "right",
  },
  formCard: {
    backgroundColor: "#27282D",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  fieldBlock: {
    marginBottom: 14,
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#F59E0B",
    letterSpacing: 0.5,
  },
  speakerBtn: {
    backgroundColor: "#334155",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  textInput: {
    backgroundColor: "#0F172A",
    borderWidth: 1.5,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 14,
  },
  visualGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  visualCard: {
    width: "30%",
    backgroundColor: "#0F172A",
    borderWidth: 1.5,
    borderColor: "#334155",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  visualCardActive: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "#F59E0B",
  },
  visualCardText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },
  visualCardTextActive: {
    color: "#F59E0B",
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  pill: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderWidth: 1.5,
    borderColor: "#334155",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  pillActive: {
    backgroundColor: "#F59E0B",
    borderColor: "#F59E0B",
  },
  pillText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
  },
  pillTextActive: {
    color: "#0F172A",
  },
  btnPrimary: {
    backgroundColor: "#F59E0B",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  btnPrimaryText: {
    color: "#0F172A",
    fontWeight: "900",
    fontSize: 14,
  },
  btnSecondary: {
    backgroundColor: "#334155",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  btnSecondaryText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
});
