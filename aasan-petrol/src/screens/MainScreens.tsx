import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  Alert,
  Clipboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { speakUrdu, speakEnglish } from "../services/device";
import { UserProfile } from "../lib/types";

type Language = "en" | "ur";
const LANG_STORAGE_KEY = "@aasan_petrol_language";

export function MainApp({
  profile,
  onLogout,
}: {
  profile: UserProfile;
  onLogout: () => void;
}) {
  const [lang, setLang] = useState<Language>("ur");
  const [activeTab, setActiveTab] = useState<"home" | "history" | "profile">("home");
  const [walletBalance, setWalletBalance] = useState<number>(2500);

  // Transaction Flow States
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [flowCategory, setFlowCategory] = useState<"petrol" | "tuckshop" | null>(null);
  const [fuelType, setFuelType] = useState<"octane" | "diesel" | "cng">("octane");
  const [amountStr, setAmountStr] = useState<string>("");
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([
    { id: "1", type: "Petrol (Octane)", amount: 1500, date: "2026-10-25", station: "Shell Gulshan" },
    { id: "2", type: "Tuck Shop", amount: 350, date: "2026-10-22", station: "PSO Defence" },
  ]);

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

  const speak = (enText: string, urText: string) => {
    if (isUrdu) speakUrdu(urText);
    else speakEnglish(enText);
  };

  const handleAddAllowance = () => {
    setWalletBalance((prev) => prev + 5000);
    speak("Added 5000 Rupees company allowance", "پانچ ہزار روپے کمپنی الائونس شامل کر دیا گیا ہے");
  };

  const handleKeypadPress = (val: string) => {
    if (val === "BACK") {
      setAmountStr((prev) => prev.slice(0, -1));
      return;
    }
    const nextVal = amountStr + val;
    const num = parseInt(nextVal, 10);
    if (!isNaN(num) && num > walletBalance) {
      setAmountStr(walletBalance.toString());
      speak(
        `Amount capped to available balance of ${walletBalance} rupees`,
        `رقم آپ کے دستیاب بیلنس ${walletBalance} روپے تک محدود کر دی گئی ہے`
      );
    } else {
      setAmountStr(nextVal);
    }
  };

  const initiateConfirmation = () => {
    const entered = parseInt(amountStr, 10);
    if (isNaN(entered) || entered <= 0) {
      Alert.alert(
        isUrdu ? "غلط رقم" : "Invalid Amount",
        isUrdu ? "براہ کرم درست رقم درج کریں۔" : "Please enter a valid amount."
      );
      return;
    }
    setShowConfirmModal(true);
    speak(
      `Do you confirm payment of ${entered} rupees for ${flowCategory}?`,
      `کیا آپ ${flowCategory === "petrol" ? "پٹرول" : "ٹک شاپ"} کے لیے ${entered} روپے کی ادائیگی کی تصدیق کرتے ہیں؟`
    );
  };

  const handleConfirmYes = () => {
    setShowConfirmModal(false);
    setShowCameraModal(true);
    speak("Please take a photo of the meter or receipt", "میٹر یا رسید کی تصویر کھینچیں");
  };

  const handleCapturePhoto = () => {
    const finalAmt = parseInt(amountStr, 10);
    setWalletBalance((prev) => prev - finalAmt);
    const newLog = {
      id: Date.now().toString(),
      type: flowCategory === "petrol" ? `Petrol (${fuelType.toUpperCase()})` : "Tuck Shop Items",
      amount: finalAmt,
      date: new Date().toISOString().split("T")[0],
      station: selectedStation || "Gulshan Station",
    };
    setHistoryLogs([newLog, ...historyLogs]);
    setShowCameraModal(false);
    setSelectedStation(null);
    setFlowCategory(null);
    setAmountStr("");
    speak("Transaction verified successfully", "ادائیگی کی تصدیق ہو گئی ہے");
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    speak(`Copied ${label}`, `${label} کاپی ہو گیا ہے`);
  };

  return (
    <View style={styles.container}>
      {/* GLOBAL PERSISTENT TOP HEADER TOGGLE */}
      <View style={styles.topHeader}>
        <View style={styles.branding}>
          <Text style={styles.brandTitle}>AASAN PETROL ⛽</Text>
        </View>
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

      {/* CONTENT BODY */}
      <View style={{ flex: 1 }}>
        {activeTab === "home" && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* WALLET CARD & HR ALLOWANCE */}
            <View style={styles.walletCard}>
              <View style={styles.walletHeader}>
                <Text style={styles.walletLabel}>
                  {isUrdu ? "کمپنی فیول والٹ بیلنس" : "COMPANY FUEL WALLET"}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    speak(
                      `Current fuel wallet balance is ${walletBalance} rupees`,
                      `آپ کا موجودہ بیلنس ${walletBalance} روپے ہے`
                    )
                  }
                  style={styles.speakerIcon}
                >
                  <Text style={{ fontSize: 18 }}>🔊</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.walletAmount}>Rs. {walletBalance}</Text>
              <TouchableOpacity style={styles.allowanceBtn} onPress={handleAddAllowance}>
                <Text style={styles.allowanceBtnText}>
                  {isUrdu ? "+ ماہانہ الائونس شامل کریں (HR Top-Up)" : "+ ADD MONTHLY ALLOWANCE"}
                </Text>
              </TouchableOpacity>
            </View>

            {!selectedStation ? (
              /* HARDCODED STATIONS LIST WITH HEAVY PICTURES */
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {isUrdu ? "قریبی پٹرول پمپ منتخب کریں" : "SELECT NEARBY PETROL PUMP"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => speak("Select a nearby petrol pump", "قریبی پٹرول پمپ منتخب کریں")}
                  >
                    <Text style={{ fontSize: 18 }}>🔊</Text>
                  </TouchableOpacity>
                </View>

                {[
                  { id: "Shell Gulshan", name: "Shell Station - Gulshan", img: "⛽ 📍 Gulshan-e-Iqbal Block 3" },
                  { id: "PSO Defence", name: "PSO Station - Defence", img: "⛽ 📍 DHA Phase 5" },
                ].map((st) => (
                  <TouchableOpacity
                    key={st.id}
                    style={styles.stationCard}
                    onPress={() => {
                      setSelectedStation(st.name);
                      speak(`Selected ${st.name}`, `${st.name} منتخب کیا گیا ہے`);
                    }}
                  >
                    <View style={styles.stationBadge}>
                      <Text style={{ fontSize: 28 }}>⛽</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stationName}>{st.name}</Text>
                      <Text style={styles.stationSub}>{st.img}</Text>
                    </View>
                    <Text style={styles.arrowText}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : !flowCategory ? (
              /* CATEGORY SELECTION: PETROL VS TUCK SHOP */
              <View style={styles.sectionBlock}>
                <TouchableOpacity onPress={() => setSelectedStation(null)} style={styles.backLink}>
                  <Text style={styles.backLinkText}>← {isUrdu ? "تبدیل کریں" : "Change Station"}</Text>
                </TouchableOpacity>

                <Text style={styles.selectedStationTitle}>{selectedStation}</Text>

                <View style={styles.categoryGrid}>
                  <TouchableOpacity
                    style={styles.categoryCard}
                    onPress={() => {
                      setFlowCategory("petrol");
                      speak("Selected Petrol Service", "پٹرول کی سہولت منتخب کی گئی ہے");
                    }}
                  >
                    <Text style={{ fontSize: 48 }}>⛽</Text>
                    <Text style={styles.categoryTitle}>{isUrdu ? "پٹرول" : "PETROL"}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.categoryCard}
                    onPress={() => {
                      setFlowCategory("tuckshop");
                      speak("Selected Tuck Shop Service", "ٹک شاپ کی سہولت منتخب کی گئی ہے");
                    }}
                  >
                    <Text style={{ fontSize: 48 }}>🛒</Text>
                    <Text style={styles.categoryTitle}>{isUrdu ? "ٹک شاپ" : "TUCK SHOP"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* AMOUNT ENTRY & KEYPAD FLOW */
              <View style={styles.sectionBlock}>
                <TouchableOpacity onPress={() => setFlowCategory(null)} style={styles.backLink}>
                  <Text style={styles.backLinkText}>← {isUrdu ? "واپس" : "Back"}</Text>
                </TouchableOpacity>

                {flowCategory === "petrol" && (
                  <View style={styles.fuelTypeRow}>
                    {(["octane", "diesel", "cng"] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.fuelPill, fuelType === type && styles.fuelPillActive]}
                        onPress={() => setFuelType(type)}
                      >
                        <Text style={[styles.fuelPillText, fuelType === type && styles.fuelPillTextActive]}>
                          {type.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.amountDisplayBlock}>
                  <Text style={styles.amountLabel}>{isUrdu ? "رقم (روپے)" : "ENTER AMOUNT (RS)"}</Text>
                  <Text style={styles.amountVal}>Rs. {amountStr || "0"}</Text>
                </View>

                {/* KEYPAD */}
                <View style={styles.keypadGrid}>
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "BACK"].map((key) => (
                    <TouchableOpacity
                      key={key}
                      style={styles.keypadBtn}
                      onPress={() => handleKeypadPress(key)}
                    >
                      <Text style={styles.keypadBtnText}>{key}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={initiateConfirmation}>
                  <Text style={styles.submitBtnText}>{isUrdu ? "آگے بڑھیں →" : "CONTINUE →"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{isUrdu ? "سابقی ہسٹری" : "TRANSACTION HISTORY"}</Text>
              <TouchableOpacity onPress={() => speak("Transaction history", "سابقی ادائیگیاں")}>
                <Text style={{ fontSize: 18 }}>🔊</Text>
              </TouchableOpacity>
            </View>

            {historyLogs.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyType}>{item.type}</Text>
                  <Text style={styles.historySub}>{item.station} • {item.date}</Text>
                </View>
                <Text style={styles.historyAmt}>- Rs. {item.amount}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* PROFILE TAB WITH COPYABLE CREDENTIALS */}
        {activeTab === "profile" && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.profileCard}>
              <View style={styles.avatarCircle}>
                <Text style={{ fontSize: 36 }}>👤</Text>
              </View>
              <Text style={styles.profileName}>{profile.full_name || "Tariq Mahmood"}</Text>
              <Text style={styles.profileRole}>{isUrdu ? "ڈرائیور / ملازم" : "Driver Employee"}</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{isUrdu ? "موبائل نمبر:" : "Phone:"}</Text>
                <Text style={styles.infoVal}>{profile.phone_number || "03001234567"}</Text>
                <TouchableOpacity onPress={() => copyToClipboard(profile.phone_number || "03001234567", "موبائل نمبر")}>
                  <Text style={{ fontSize: 16 }}>📋</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{isUrdu ? "شناختی کارڈ:" : "CNIC:"}</Text>
                <Text style={styles.infoVal}>42101-1234567-1</Text>
                <TouchableOpacity onPress={() => copyToClipboard("4210112345671", "شناختی کارڈ")}>
                  <Text style={{ fontSize: 16 }}>📋</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
                <Text style={styles.logoutBtnText}>{isUrdu ? "لاگ آؤٹ" : "LOGOUT"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>

      {/* BOTTOM TAB BAR */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "home" && styles.tabItemActive]}
          onPress={() => setActiveTab("home")}
        >
          <Text style={{ fontSize: 20 }}>⛽</Text>
          <Text style={[styles.tabLabel, activeTab === "home" && styles.tabLabelActive]}>
            {isUrdu ? "ہوم" : "Home"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "history" && styles.tabItemActive]}
          onPress={() => setActiveTab("history")}
        >
          <Text style={{ fontSize: 20 }}>📜</Text>
          <Text style={[styles.tabLabel, activeTab === "history" && styles.tabLabelActive]}>
            {isUrdu ? "ہسٹری" : "History"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "profile" && styles.tabItemActive]}
          onPress={() => setActiveTab("profile")}
        >
          <Text style={{ fontSize: 20 }}>👤</Text>
          <Text style={[styles.tabLabel, activeTab === "profile" && styles.tabLabelActive]}>
            {isUrdu ? "پروفائل" : "Profile"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2-STEP CONFIRMATION POPUP MODAL */}
      <Modal visible={showConfirmModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{isUrdu ? "تصدیق کریں" : "CONFIRM TRANSACTION"}</Text>
            <Text style={styles.modalSub}>
              {isUrdu
                ? `کیا آپ واقعی Rs. ${amountStr} کی ادائیگی کرنا چاہتے ہیں؟`
                : `Are you sure you want to proceed with Rs. ${amountStr}?`}
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.btnNo} onPress={() => setShowConfirmModal(false)}>
                <Text style={styles.btnNoText}>{isUrdu ? "نہیں (NO)" : "NO"}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnYes} onPress={handleConfirmYes}>
                <Text style={styles.btnYesText}>{isUrdu ? "ہاں (YES)" : "YES"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CAMERA / METER EVIDENCE MODAL */}
      <Modal visible={showCameraModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={{ fontSize: 54, alignSelf: "center", marginBottom: 10 }}>📸</Text>
            <Text style={styles.modalTitle}>{isUrdu ? "میٹر کی تصویر کھینچیں" : "CAPTURE METER PHOTO"}</Text>
            <Text style={styles.modalSub}>
              {isUrdu
                ? "پٹرول میٹر یا رسید کا کیمرہ ویو دیکھ کر تصدیق کریں"
                : "Point camera to fuel meter display or paper receipt"}
            </Text>

            <TouchableOpacity style={styles.btnYes} onPress={handleCapturePhoto}>
              <Text style={styles.btnYesText}>{isUrdu ? "تصویر محفوظ کریں" : "SNAP & VERIFY"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A",
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 12,
    backgroundColor: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  branding: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandTitle: {
    color: "#F59E0B",
    fontSize: 16,
    fontWeight: "900",
  },
  langToggle: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 2,
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  langBtnActive: {
    backgroundColor: "#F59E0B",
  },
  langText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
  },
  langTextActive: {
    color: "#0F172A",
  },
  scrollContent: {
    padding: 16,
  },
  walletCard: {
    backgroundColor: "#27282D",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#F59E0B",
    marginBottom: 16,
  },
  walletHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletLabel: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "900",
  },
  speakerIcon: {
    padding: 4,
  },
  walletAmount: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    marginVertical: 8,
  },
  allowanceBtn: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  allowanceBtnText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "800",
  },
  sectionBlock: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#F59E0B",
    fontSize: 14,
    fontWeight: "900",
  },
  stationCard: {
    backgroundColor: "#27282D",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  stationBadge: {
    marginRight: 12,
  },
  stationName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  stationSub: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
  },
  arrowText: {
    color: "#F59E0B",
    fontSize: 20,
    fontWeight: "900",
  },
  backLink: {
    marginBottom: 12,
  },
  backLinkText: {
    color: "#F59E0B",
    fontWeight: "bold",
  },
  selectedStationTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 16,
  },
  categoryGrid: {
    flexDirection: "row",
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: "#27282D",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F59E0B",
  },
  categoryTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 10,
  },
  fuelTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  fuelPill: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  fuelPillActive: {
    backgroundColor: "#F59E0B",
    borderColor: "#F59E0B",
  },
  fuelPillText: {
    color: "#94A3B8",
    fontWeight: "800",
  },
  fuelPillTextActive: {
    color: "#0F172A",
  },
  amountDisplayBlock: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  amountLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
  },
  amountVal: {
    color: "#F59E0B",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 4,
  },
  keypadGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  keypadBtn: {
    width: "30%",
    backgroundColor: "#27282D",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  keypadBtnText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  submitBtn: {
    backgroundColor: "#F59E0B",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  submitBtnText: {
    color: "#0F172A",
    fontWeight: "900",
    fontSize: 16,
  },
  historyCard: {
    backgroundColor: "#27282D",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  historyType: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  historySub: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
  },
  historyAmt: {
    color: "#EF4444",
    fontWeight: "900",
    fontSize: 14,
  },
  profileCard: {
    backgroundColor: "#27282D",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  profileName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  profileRole: {
    color: "#F59E0B",
    fontSize: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    backgroundColor: "#0F172A",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  infoLabel: {
    color: "#94A3B8",
    fontSize: 12,
  },
  infoVal: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 12,
  },
  logoutBtn: {
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 20,
  },
  logoutBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  bottomTabBar: {
    flexDirection: "row",
    backgroundColor: "#0F172A",
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingVertical: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
  },
  tabItemActive: {
    borderTopWidth: 2,
    borderTopColor: "#F59E0B",
  },
  tabLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
  },
  tabLabelActive: {
    color: "#F59E0B",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: "#27282D",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#F59E0B",
  },
  modalTitle: {
    color: "#F59E0B",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSub: {
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
  },
  btnNo: {
    flex: 1,
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnNoText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  btnYes: {
    flex: 1,
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnYesText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});
