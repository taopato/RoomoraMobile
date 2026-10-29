import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, PinchGestureHandler, State as GestureState } from 'react-native-gesture-handler';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { houseApi, receiptsApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { LoadingState, PageHeader } from '../shared/ui/roomora/CanonicalUI';
import { BASE_URL } from '../shared/config/env';
import DateField from '../shared/ui/DateField';
import eventBus from '../shared/events/bus';
import {
  calculateItemsTotal,
  extractDetectedTotalFromRawText,
  isMeaningfulReceiptItem,
  normalizeReceiptItems,
  normalizeResolvedItems,
  parseReceiptAmount,
  receiptTotalsMatch,
  resolveReceiptItems,
} from '../utils/receiptParser';
import {
  buildReceiptAssignment,
  getMemberIds,
  getReceiptItemParticipantIds,
  getReceiptParticipantSummary,
} from '../utils/receiptAssignments';
import { normalizeExpenseCategoryKey } from '../constants/ExpenseEnums';
import { getReadableReceiptItemName, getReceiptStoreName, getReceiptTitle } from '../utils/receiptPresentation';

import { Alert, Text, TextInput } from '../shared/i18n';
import { getLocale } from '../shared/i18n/runtime';

import { TouchableOpacity } from '../shared/i18n';

const CATEGORY_OPTIONS = [
  { key: 'Market', label: 'Market' },
  { key: 'Food', label: 'Yemek' },
  { key: 'Other', label: 'Diğer' },
];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};


const hydrateParticipantAssignments = (items, members) => items.map((item) => ({
  ...item,
  ...buildReceiptAssignment(getReceiptItemParticipantIds(item, members), members),
}));

function FisDetayiInner({ route, navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const receiptId = route?.params?.receiptId;
  const houseId = route?.params?.houseId || user?.defaultHouseId;
  const editConverted = route?.params?.editConverted === true;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [totalInput, setTotalInput] = useState('');
  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [payerUserId, setPayerUserId] = useState(String(user?.id || ''));
  const [category, setCategory] = useState('Market');
  const [editingIndex, setEditingIndex] = useState(null);
  const [draftItem, setDraftItem] = useState(null);
  const [imageFrame, setImageFrame] = useState({ width: 0, height: 260 });
  const [imageZoom, setImageZoom] = useState(1);
  const [showPhoto, setShowPhoto] = useState(false);
  const [pinchPreviewScale, setPinchPreviewScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panDrag, setPanDrag] = useState({ x: 0, y: 0 });
  const isConverted = String(receipt?.status ?? '').toLowerCase() === 'converted'
    || Number(receipt?.status) === 3;
  const canEdit = !isConverted || editConverted;

  const load = async () => {
    if (!receiptId || !houseId) return;
    setLoading(true);
    try {
      const [receiptRes, membersRes] = await Promise.all([
        receiptsApi.getById(receiptId),
        houseApi.getMembers(houseId),
      ]);

      let receiptData = receiptRes?.data;
      const rawMembers = Array.isArray(membersRes?.data?.data)
        ? membersRes.data.data
        : Array.isArray(membersRes?.data)
          ? membersRes.data
          : [];

      const normalizedMembers = rawMembers
        .map((item) => ({
          id: Number(item.userId ?? item.id),
          fullName: item.fullName ?? item.name ?? 'Uye',
        }))
        .filter((item) => Number.isFinite(item.id));

      let normalizedItems = normalizeReceiptItems(receiptData?.items || []);
      const meaningfulExistingItems = normalizeResolvedItems(normalizedItems);
      const rawDetectedTotal = extractDetectedTotalFromRawText(receiptData?.rawOcrText);
      const explicitExistingTotal = calculateItemsTotal(meaningfulExistingItems);
      const hasMeaninglessSavedItems = normalizedItems.some((item) => !isMeaningfulReceiptItem(item));
      const receiptIsConverted = String(receiptData?.status ?? '').toLowerCase() === 'converted'
        || Number(receiptData?.status) === 3;
      const shouldReparse = !receiptIsConverted && (
        normalizedItems.length === 0
        || normalizedItems.every((item) => toNumber(item.lineTotal) <= 0)
        || normalizedItems.every((item) => item.boxLeft == null || item.boxTop == null || item.boxWidth == null || item.boxHeight == null)
        || meaningfulExistingItems.length === 0
        || hasMeaninglessSavedItems
        || (rawDetectedTotal > 0 && explicitExistingTotal + 0.5 < rawDetectedTotal)
      );

      if (shouldReparse) {
        try {
          const reparsedRes = await receiptsApi.reparse(receiptId);
          if (reparsedRes?.data) {
            receiptData = reparsedRes.data;
            normalizedItems = normalizeReceiptItems(receiptData?.items || []);
          }
        } catch {}
      }

      const correctedDetectedTotal = toNumber(receiptData?.detectedTotalAmount)
        || extractDetectedTotalFromRawText(receiptData?.rawOcrText);

      setReceipt({
        ...receiptData,
        storeName: getReceiptStoreName(receiptData) || receiptData?.storeName,
        detectedTotalAmount: correctedDetectedTotal,
      });
      setTotalInput(correctedDetectedTotal > 0 ? String(correctedDetectedTotal).replace('.', ',') : '');
      setItems(hydrateParticipantAssignments(
        resolveReceiptItems(normalizedItems, receiptData?.rawOcrText, correctedDetectedTotal),
        normalizedMembers
      ));
      setMembers(normalizedMembers);
      if (receiptData?.convertedExpense) {
        setPayerUserId(String(receiptData.convertedExpense.odeyenUserId || ''));
        setCategory(normalizeExpenseCategoryKey(receiptData.convertedExpense.category) || 'Market');
      }
      if (!payerUserId && normalizedMembers.length > 0) {
        setPayerUserId(String(normalizedMembers[0].id));
      }
    } catch {
      Alert.alert('Hata', 'Fiş detayları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [receiptId, houseId]);

  const imageUri = receipt?.imageUrl
    ? (receipt.imageUrl.startsWith('http') ? receipt.imageUrl : `${BASE_URL}${receipt.imageUrl}`)
    : null;

  const patchItem = (index, next) => {
    if (!canEdit) return;
    setItems((prev) => prev.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...next } : item
    )));
  };

  const addItem = () => {
    if (!canEdit) return;
    setItems((prev) => [
      ...prev,
      {
        name: '',
        price: 0,
        quantity: 1,
        lineTotal: 0,
        isAssigned: false,
        isShared: true,
        personalUserId: null,
        participantUserIds: getMemberIds(members),
        sortOrder: prev.length,
      },
    ]);
  };

  const removeItem = (index) => {
    if (!canEdit) return;
    setItems((prev) => prev
      .filter((_, itemIndex) => itemIndex !== index)
      .map((item, itemIndex) => ({ ...item, sortOrder: itemIndex })));
  };

  const openEditor = (index) => {
    if (!canEdit) return;
    const source = items[index];
    if (!source) return;

    setEditingIndex(index);
    setDraftItem({
      name: source.name ?? '',
      originalName: source.name ?? '',
      price: String(source.price ?? ''),
      quantity: String(source.quantity ?? 1),
      lineTotal: String(source.lineTotal ?? source.price ?? 0),
      participantUserIds: getReceiptItemParticipantIds(source, members),
    });
  };

  const closeEditor = () => {
    setEditingIndex(null);
    setDraftItem(null);
  };

  const saveEditor = () => {
    if (editingIndex == null || !draftItem) return;
    if (!String(draftItem.name || '').trim()) {
      Alert.alert('Ürün adı gerekli', 'Kalem için bir ürün adı gir.');
      return;
    }
    if (!draftItem.participantUserIds?.length) {
      Alert.alert('Kişi seç', 'Bu kalemi en az bir kişiyle paylaş.');
      return;
    }

    const price = toNumber(draftItem.price);
    const quantity = toNumber(draftItem.quantity, 1) || 1;
    const lineTotal = toNumber(draftItem.lineTotal, price * quantity);

    patchItem(editingIndex, {
      name: String(draftItem.name || '').trim(),
      price,
      quantity,
      lineTotal,
      ...buildReceiptAssignment(draftItem.participantUserIds, members),
    });
    closeEditor();
  };

  const buildPayloadItems = () => {
    const normalized = items
      .filter(isMeaningfulReceiptItem)
      .map((item, index) => ({
      name: String(item.name || '').trim() || `Kalem ${index + 1}`,
      price: toNumber(item.price),
      quantity: toNumber(item.quantity, 1) || 1,
      lineTotal: toNumber(item.lineTotal, toNumber(item.price) * (toNumber(item.quantity, 1) || 1)),
      boxLeft: item.boxLeft ?? null,
      boxTop: item.boxTop ?? null,
      boxWidth: item.boxWidth ?? null,
      boxHeight: item.boxHeight ?? null,
      isAssigned: Boolean(item.isAssigned),
      isShared: Boolean(item.isShared),
      personalUserId: item.personalUserId ?? null,
      participantUserIds: getReceiptItemParticipantIds(item, members),
      sortOrder: index,
    }));

    return normalized;
  };

  const saveDraft = async ({ silent = false } = {}) => {
    if (!receiptId) return null;
    const payloadItems = buildPayloadItems();
    if (!payloadItems.length) {
      if (!silent) Alert.alert('Uyarı', 'En az bir fiş kalemi olmalı.');
      return null;
    }
    if (payloadItems.some((item) => !item.participantUserIds.length)) {
      if (!silent) Alert.alert('Uyarı', 'Her kalem için en az bir kişi seçmelisin.');
      return null;
    }

    setSaving(true);
    try {
      const preservedDetectedTotal = toNumber(receipt?.detectedTotalAmount);

      const payload = {
        storeName: getReceiptStoreName(receipt) || receipt?.storeName || 'Fiş',
        receiptDate: receipt?.receiptDate,
        detectedTotalAmount: preservedDetectedTotal,
        items: payloadItems,
      };
      const response = isConverted
        ? await receiptsApi.updateConverted(receiptId, {
          ...payload,
          payerUserId: Number(payerUserId),
          category,
          note: receipt?.convertedExpense?.note || receipt?.storeName || 'Fişten oluşturuldu',
        })
        : await receiptsApi.update(receiptId, payload);
      const nextReceipt = response?.data;
      if (nextReceipt) {
        const normalizedItems = (nextReceipt.items || []).map((item, index) => ({
          ...item,
          sortOrder: item.sortOrder ?? index,
          price: toNumber(item.price),
          quantity: toNumber(item.quantity, 1),
          lineTotal: toNumber(item.lineTotal ?? item.price),
          isAssigned: item?.isAssigned === true,
          isShared: item.isShared !== false,
        }));
        const correctedDetectedTotal = toNumber(nextReceipt?.detectedTotalAmount);
        setReceipt({
          ...nextReceipt,
          detectedTotalAmount: correctedDetectedTotal,
        });
        setTotalInput(correctedDetectedTotal > 0 ? String(correctedDetectedTotal).replace('.', ',') : '');
        setItems(hydrateParticipantAssignments(
          resolveReceiptItems(normalizedItems, nextReceipt?.rawOcrText, correctedDetectedTotal),
          members
        ));
      }
      return nextReceipt;
    } catch {
      if (!silent) Alert.alert('Hata', 'Fiş taslağı kaydedilemedi.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveConvertedExpense = async () => {
    if (hasTotalMismatch) {
      Alert.alert('Tutarlar uyuşmuyor', 'Fiş toplamını ve kalemleri kontrol edip eşitle.');
      return;
    }
    if (!payerUserId) {
      Alert.alert('Uyarı', 'Önce ödeyen kişiyi seç.');
      return;
    }
    const saved = await saveDraft();
    if (!saved) return;
    eventBus.emit('expenses:updated', { houseId: Number(houseId) });
    Alert.alert('Başarılı', 'Fiş kalemleri ve harcama paylaşımı güncellendi.', [
      { text: 'Tamam', onPress: () => navigation.goBack() },
    ]);
  };

  const convertToExpense = async () => {
    if (hasTotalMismatch) {
      Alert.alert('Tutarlar uyuşmuyor', 'Fiş toplamını ve kalemleri kontrol edip eşitle. Eksik tutar otomatik olarak kimseye paylaştırılmaz.');
      return;
    }
    if (!payerUserId) {
      Alert.alert('Uyarı', 'Önce ödeyen kişiyi seç.');
      return;
    }

    const saved = await saveDraft({ silent: true });
    if (!saved) {
      Alert.alert('Hata', 'Dönüşüm öncesi fiş kaydedilemedi.');
      return;
    }

    setSaving(true);
    try {
      await receiptsApi.convertToExpense(receiptId, {
        payerUserId: Number(payerUserId),
        note: getReceiptTitle(receipt),
        category,
      });
      Alert.alert('Başarılı', 'Fiş harcamaya dönüştürüldü.');
      navigation.navigate('MainTabs', { screen: 'TumHarcamalar' });
    } catch {
      Alert.alert('Hata', 'Fiş harcamaya dönüştürülemedi.');
    } finally {
      setSaving(false);
    }
  };

  const confirmConvertToExpense = () => {
    if (hasTotalMismatch) {
      Alert.alert('Tutarlar uyuşmuyor', 'Fiş toplamını ve kalemleri kontrol edip eşitle. Eksik tutar otomatik olarak kimseye paylaştırılmaz.');
      return;
    }
    Alert.alert(
      'Fişi kontrol ettin mi?',
      'Ürün adlarını, indirimleri, tutarları ve kime ait olduklarını kontrol et. Kaydedildikten sonra borçlar bu kalemlere göre hesaplanacak.',
      [
        { text: 'Geri dön', style: 'cancel' },
        { text: 'Kontrol ettim', onPress: convertToExpense },
      ]
    );
  };

  const deleteReceipt = () => {
    if (!receiptId || isConverted || saving) return;
    Alert.alert(
      'Fişi sil',
      'Bu fiş ve taranan görseli kalıcı olarak silinecek.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await receiptsApi.remove(receiptId);
              navigation.goBack();
            } catch {
              Alert.alert('Hata', 'Fiş silinemedi. Lütfen tekrar dene.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const explicitTotal = items.reduce((sum, item) => sum + toNumber(item.lineTotal), 0);
  const detectedTotal = toNumber(receipt?.detectedTotalAmount);
  const total = detectedTotal > 0 ? detectedTotal : explicitTotal;
  const hasTotalMismatch = !receiptTotalsMatch(detectedTotal, items);
  const memberIds = getMemberIds(members);
  const subsetTotal = items
    .filter((item) => getReceiptItemParticipantIds(item, members).length !== memberIds.length)
    .reduce((sum, item) => sum + toNumber(item.lineTotal), 0);
  const sharedTotal = Math.max(explicitTotal - subsetTotal, 0);

  const totalZoom = imageZoom * pinchPreviewScale;
  const totalPan = {
    x: panOffset.x + panDrag.x,
    y: panOffset.y + panDrag.y,
  };
  const clampPan = (value, axis, zoom = totalZoom) => {
    const base = axis === 'x' ? imageFrame.width : imageFrame.height;
    const max = Math.max(0, ((base * zoom) - base) / 2);
    return Math.min(max, Math.max(-max, value));
  };
  const clampZoom = (value) => Math.min(3, Math.max(1, value));

  const handlePinchGesture = (event) => {
    const nextScale = clampZoom(event.nativeEvent.scale || 1);
    setPinchPreviewScale(nextScale);
  };

  const handlePinchStateChange = (event) => {
    const { oldState, scale } = event.nativeEvent;
    if (oldState === GestureState.ACTIVE) {
      const nextZoom = clampZoom(imageZoom * (scale || 1));
      setImageZoom(nextZoom);
      setPanOffset((prev) => ({
        x: clampPan(prev.x, 'x', nextZoom),
        y: clampPan(prev.y, 'y', nextZoom),
      }));
      setPinchPreviewScale(1);
    }
  };

  const handlePanGesture = (event) => {
    if (totalZoom <= 1.01) return;
    setPanDrag({
      x: event.nativeEvent.translationX,
      y: event.nativeEvent.translationY,
    });
  };

  const handlePanStateChange = (event) => {
    if (event.nativeEvent.oldState === GestureState.ACTIVE) {
      const nextX = clampPan(panOffset.x + event.nativeEvent.translationX, 'x');
      const nextY = clampPan(panOffset.y + event.nativeEvent.translationY, 'y');
      setPanOffset({ x: nextX, y: nextY });
      setPanDrag({ x: 0, y: 0 });
    }
  };

  const visibleItems = useMemo(() => (
    items
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const topA = a.item?.boxTop ?? Number.MAX_SAFE_INTEGER;
        const topB = b.item?.boxTop ?? Number.MAX_SAFE_INTEGER;
        if (topA !== topB) return topA - topB;
        return a.index - b.index;
      })
  ), [items]);
  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 4 }]}>
        <PageHeader title="Fiş Tarama Sonucu" onBack={() => navigation.goBack()} />
        <LoadingState label="Fiş okunuyor..." />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 4 }]}
        directionalLockEnabled
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader
          title={editConverted ? 'Fiş Harcamasını Düzenle' : (isConverted ? 'Fiş Detayı' : 'Fiş Tarama Sonucu')}
          subtitle={editConverted ? 'Kalemleri, tarihi ve paylaşımı güncelle' : (isConverted ? 'Kaydedilmiş fiş' : 'Bilgileri kontrol edip kaydet')}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{getReceiptTitle(receipt, getLocale())}</Text>
          <Text style={styles.summarySub}>
            {getLocale().startsWith('en') ? 'Receipt date' : 'Fiş tarihi'}: {receipt?.receiptDate ? new Date(receipt.receiptDate).toLocaleDateString(getLocale()) : '-'}
          </Text>
          {receipt?.createdAt ? <Text style={styles.summarySub}>{getLocale().startsWith('en') ? 'Added' : 'Eklendi'}: {new Date(receipt.createdAt).toLocaleDateString(getLocale())}</Text> : null}
          <Text style={styles.summaryAmount}>
            {total.toLocaleString(getLocale(), { style: 'currency', currency: 'TRY' })}
          </Text>
          {canEdit ? (
            <View style={styles.totalCorrection}>
              <Text style={styles.summaryMetaLabel}>Fiş toplamı (kontrol et veya düzelt)</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={totalInput}
                onChangeText={(value) => {
                  setTotalInput(value);
                  setReceipt((current) => ({ ...current, detectedTotalAmount: parseReceiptAmount(value) || 0 }));
                }}
                accessibilityLabel="Fiş toplamını düzelt"
              />
            </View>
          ) : null}
          <View style={styles.summaryMetaRow}>
            <View style={styles.summaryMetaBadge}>
              <Text style={styles.summaryMetaLabel}>Tüm ev</Text>
              <Text style={styles.summaryMetaValue}>{sharedTotal.toLocaleString(getLocale(), { style: 'currency', currency: 'TRY' })}</Text>
            </View>
            <View style={styles.summaryMetaBadge}>
              <Text style={styles.summaryMetaLabel}>Seçili kişiler</Text>
              <Text style={styles.summaryMetaValue}>{subsetTotal.toLocaleString(getLocale(), { style: 'currency', currency: 'TRY' })}</Text>
            </View>
          </View>
          {hasTotalMismatch ? (
            <View style={styles.missingAmountCard}>
              <Text style={styles.missingAmountTitle}>Fiş tutarlarını kontrol et</Text>
              <Text style={styles.missingAmountText}>
                Okunan fiş toplamı {detectedTotal.toLocaleString(getLocale(), { style: 'currency', currency: 'TRY' })}, kalemlerin toplamı {explicitTotal.toLocaleString(getLocale(), { style: 'currency', currency: 'TRY' })}.
                Eksik veya fazla okunan kalemleri düzeltmeden harcamaya dönüştüremezsin; hiçbir fark otomatik paylaştırılmaz.
              </Text>
            </View>
          ) : null}
        </View>

        {!canEdit ? (
          <View style={styles.convertedNotice}>
            <Text style={styles.convertedNoticeTitle}>Harcamaya dönüştürüldü</Text>
            <Text style={styles.convertedNoticeText}>Bu fiş kayıt bütünlüğü için salt okunur gösteriliyor.</Text>
          </View>
        ) : null}
        {imageUri ? (
          <TouchableOpacity style={styles.photoToggle} onPress={() => setShowPhoto((current) => !current)} accessibilityLabel={showPhoto ? 'Fiş fotoğrafını gizle' : 'Fiş fotoğrafını görüntüle'}>
            <Ionicons name="receipt-outline" size={19} color={theme.colors.primary[700]} />
            <Text style={styles.photoToggleText}>{showPhoto ? 'Fişi gizle' : 'Fişi görüntüle'}</Text>
            <Ionicons name={showPhoto ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        ) : null}
        {imageUri && showPhoto ? (
          <>
            <View style={styles.zoomToolbar}>
              <TouchableOpacity style={styles.zoomButton} onPress={() => setImageZoom((prev) => Math.max(1, Number((prev - 0.25).toFixed(2))))}>
                <Text style={styles.zoomButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.zoomLabel}>Yakınlık %{Math.round(imageZoom * 100)}</Text>
              <TouchableOpacity style={styles.zoomButton} onPress={() => setImageZoom((prev) => Math.min(3, Number((prev + 0.25).toFixed(2))))}>
                <Text style={styles.zoomButtonText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.zoomResetButton} onPress={() => setImageZoom(1)}>
                <Text style={styles.zoomResetButtonText}>Sıfırla</Text>
              </TouchableOpacity>
            </View>
            <PinchGestureHandler onGestureEvent={handlePinchGesture} onHandlerStateChange={handlePinchStateChange}>
              <View>
                <PanGestureHandler
                  enabled={totalZoom > 1.01}
                  minDist={16}
                  minPointers={1}
                  maxPointers={1}
                  onGestureEvent={handlePanGesture}
                  onHandlerStateChange={handlePanStateChange}
                >
                  <View
                    style={styles.previewFrame}
                    onLayout={(event) => {
                      const { width, height } = event.nativeEvent.layout;
                      if (width && height) {
                        setImageFrame({ width, height });
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.previewCanvas,
                        {
                          transform: [
                            { scale: totalZoom },
                            { translateX: totalPan.x },
                            { translateY: totalPan.y },
                          ],
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.preview}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                </PanGestureHandler>
              </View>
            </PinchGestureHandler>
          </>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Kalemler ve paylaşım</Text>
            {canEdit ? (
              <TouchableOpacity onPress={addItem}>
                <Text style={styles.addText}>+ Kalem ekle</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {visibleItems.map(({ item, index }) => {
            const participantIds = getReceiptItemParticipantIds(item, members);
            const participantSummary = getReceiptParticipantSummary(participantIds, members);
            const quantity = toNumber(item.quantity, 1) || 1;
            const unitPrice = toNumber(item.price);
            const lineTotal = toNumber(item.lineTotal);

            return (
              <View
                key={`${index}-${item.id || 'new'}`}
                style={styles.itemCard}
              >
                <TouchableOpacity style={styles.rowBetween} onPress={() => openEditor(index)} disabled={!canEdit} accessibilityLabel={`${getReadableReceiptItemName(item.name)}, kalemi düzenle`}>
                  <View style={styles.itemHeaderLeft}>
                    <View style={styles.itemNumberBadge}>
                      <Text style={styles.itemNumberBadgeText}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName} numberOfLines={2}>{getReadableReceiptItemName(item.name) || 'İsimsiz kalem'}</Text>
                      <Text style={styles.itemSubText} numberOfLines={1}>
                        {quantity.toLocaleString(getLocale())} × {unitPrice.toLocaleString(getLocale(), { style: 'currency', currency: 'TRY' })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.itemAmountBlock}>
                    <Text style={styles.itemAmount}>{lineTotal.toLocaleString(getLocale(), { style: 'currency', currency: 'TRY' })}</Text>
                    {canEdit ? <Ionicons name="chevron-forward" size={18} color={theme.colors.neutral[400]} /> : null}
                  </View>
                </TouchableOpacity>

                <View style={styles.itemFooter}>
                  <TouchableOpacity style={[styles.assignmentButton, { flex: 1 }]} onPress={() => openEditor(index)} disabled={!canEdit} activeOpacity={0.82}>
                    <View style={styles.assignmentIcon}>
                      <Ionicons name="people-outline" size={18} color={theme.colors.primary[700]} />
                    </View>
                    <View style={styles.assignmentBody}>
                      <Text style={styles.assignmentLabel}>Paylaşım</Text>
                      <Text style={styles.assignmentValue} numberOfLines={2}>{participantSummary}</Text>
                    </View>
                  </TouchableOpacity>
                  {canEdit ? (
                    <TouchableOpacity style={styles.deleteItemButton} onPress={() => removeItem(index)} accessibilityLabel="Kalemi sil">
                      <Ionicons name="trash-outline" size={18} color={theme.colors.error[600]} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        {canEdit ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Harcama tarihi</Text>
              <DateField
                value={receipt?.receiptDate ? String(receipt.receiptDate).slice(0, 10) : ''}
                onChange={(value) => setReceipt((current) => ({
                  ...current,
                  receiptDate: `${value}T12:00:00.000Z`,
                }))}
                placeholder="Tarih seç"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ödeyen</Text>
              <View style={styles.chips}>
                {members.map((member) => {
                  const active = String(member.id) === String(payerUserId);
                  return (
                    <TouchableOpacity
                      key={String(member.id)}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setPayerUserId(String(member.id))}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{member.fullName}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kategori</Text>
              <View style={styles.chips}>
                {CATEGORY_OPTIONS.map((option) => {
                  const active = option.key === category;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setCategory(option.key)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {editConverted ? (
              <TouchableOpacity style={styles.primaryButton} onPress={saveConvertedExpense} disabled={saving}>
                <Text style={styles.primaryButtonText}>{saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => saveDraft()} disabled={saving}>
                  <Text style={styles.secondaryButtonText}>{saving ? 'Kaydediliyor...' : 'Taslağı Kaydet'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={confirmConvertToExpense} disabled={saving}>
                  <Text style={styles.primaryButtonText}>Harcamaya Dönüştür</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteReceiptButton} onPress={deleteReceipt} disabled={saving}>
                  <Text style={styles.deleteReceiptButtonText}>Fişi Sil</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        ) : null}
      </ScrollView>

      <View pointerEvents="none" style={[styles.statusBarGuard, { height: insets.top }]} />

      <Modal visible={editingIndex != null && !!draftItem} transparent animationType="slide" onRequestClose={closeEditor}>
        <Pressable style={styles.modalBackdrop} onPress={closeEditor} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 84 : 0}>
          <View style={styles.modalSheet}>
            <KeyboardAwareScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalContent}
              enableOnAndroid
              extraScrollHeight={20}
              keyboardOpeningTime={0}
            >
              <Text style={styles.modalTitle}>Kalemi düzenle</Text>
              <Text style={styles.modalHint}>Ürün bilgilerini ve tutarı paylaşacak kişileri güncelleyebilirsin.</Text>
              {draftItem?.originalName ? <Text style={styles.originalName}>Fişteki ad: {draftItem.originalName}</Text> : null}
              {draftItem?.originalName && getReadableReceiptItemName(draftItem.originalName) !== draftItem.originalName ? (
                <TouchableOpacity style={styles.nameSuggestion} onPress={() => setDraftItem((prev) => ({ ...prev, name: getReadableReceiptItemName(prev.originalName) }))}>
                  <Text style={styles.nameSuggestionText}>Önerilen ad: {getReadableReceiptItemName(draftItem.originalName)}</Text>
                  <Ionicons name="arrow-forward" size={16} color={theme.colors.primary[700]} />
                </TouchableOpacity>
              ) : null}

              <TextInput
                style={styles.input}
                placeholder="Ürün adı"
                value={draftItem?.name ?? ''}
                onChangeText={(value) => setDraftItem((prev) => ({ ...prev, name: value }))}
              />

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.half]}
                  placeholder="Fiyat"
                  keyboardType="decimal-pad"
                  value={draftItem?.price ?? ''}
                  onChangeText={(value) => setDraftItem((prev) => {
                    const quantity = toNumber(prev?.quantity, 1) || 1;
                    const numeric = toNumber(value);
                    return { ...prev, price: value, lineTotal: String((numeric * quantity).toFixed(2)) };
                  })}
                />
                <TextInput
                  style={[styles.input, styles.half]}
                  placeholder="Adet"
                  keyboardType="decimal-pad"
                  value={draftItem?.quantity ?? '1'}
                  onChangeText={(value) => setDraftItem((prev) => {
                    const price = toNumber(prev?.price);
                    const numeric = toNumber(value, 1) || 1;
                    return { ...prev, quantity: value, lineTotal: String((price * numeric).toFixed(2)) };
                  })}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Toplam"
                keyboardType="decimal-pad"
                value={draftItem?.lineTotal ?? ''}
                onChangeText={(value) => setDraftItem((prev) => ({ ...prev, lineTotal: value }))}
              />

              <View style={styles.memberSelectList}>
                <TouchableOpacity
                  style={styles.memberSelectRow}
                  onPress={() => setDraftItem((prev) => ({
                    ...prev,
                    participantUserIds: memberIds,
                  }))}
                >
                  <View style={styles.memberSelectIcon}>
                    <Ionicons name="people-outline" size={19} color={theme.colors.primary[700]} />
                  </View>
                  <Text style={styles.memberSelectName}>Tüm ev</Text>
                  <Ionicons
                    name={draftItem?.participantUserIds?.length === memberIds.length ? 'checkmark-circle' : 'ellipse-outline'}
                    size={23}
                    color={draftItem?.participantUserIds?.length === memberIds.length ? theme.colors.primary[600] : theme.colors.neutral[400]}
                  />
                </TouchableOpacity>
                {members.map((member) => {
                  const active = (draftItem?.participantUserIds || []).includes(Number(member.id));
                  return (
                    <TouchableOpacity
                      key={`draft-${member.id}`}
                      style={styles.memberSelectRow}
                      onPress={() => setDraftItem((prev) => {
                        const current = prev?.participantUserIds || [];
                        const userId = Number(member.id);
                        return {
                          ...prev,
                          participantUserIds: current.includes(userId)
                            ? current.filter((id) => id !== userId)
                            : [...current, userId],
                        };
                      })}
                    >
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>{String(member.fullName || '?').charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={styles.memberSelectName} numberOfLines={1}>{member.fullName}</Text>
                      <Ionicons
                        name={active ? 'checkmark-circle' : 'ellipse-outline'}
                        size={23}
                        color={active ? theme.colors.primary[600] : theme.colors.neutral[400]}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalSecondaryButton} onPress={closeEditor}>
                  <Text style={styles.modalSecondaryButtonText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalPrimaryButton} onPress={saveEditor}>
                  <Text style={styles.modalPrimaryButtonText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAwareScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

class FisDetayiErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('FisDetayi render hatası:', error?.message, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontWeight: '800', fontSize: 17, marginBottom: 8, textAlign: 'center' }}>
            Fiş görüntülenemedi
          </Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 }}>
            Bu fişi açarken beklenmeyen bir hata oluştu. Lütfen geri dönüp tekrar dene.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#172839', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 }}
            onPress={() => this.props.navigation?.goBack?.()}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Geri dön</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function FisDetayi(props) {
  return (
    <FisDetayiErrorBoundary navigation={props.navigation}>
      <FisDetayiInner {...props} />
    </FisDetayiErrorBoundary>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  statusBarGuard: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 18, paddingBottom: 36 },
  photoToggle: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, marginBottom: 12, borderRadius: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.neutral[200] },
  photoToggleText: { flex: 1, color: theme.colors.primary[700], fontFamily: theme.typography.semibold, fontSize: 14 },
  previewFrame: { width: '100%', height: 260, borderRadius: 8, backgroundColor: theme.colors.neutral[100], marginBottom: 14, overflow: 'hidden', position: 'relative' },
  previewCanvas: { position: 'relative', backgroundColor: theme.colors.neutral[100], width: '100%', height: '100%' },
  preview: { width: '100%', height: '100%' },
  zoomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  zoomButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  zoomButtonText: { color: theme.colors.text.primary, fontSize: 20, fontWeight: '900' },
  zoomLabel: { color: theme.colors.text.secondary, fontWeight: '700', flex: 1 },
  zoomResetButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  zoomResetButtonText: { color: theme.colors.text.primary, fontWeight: '700' },
  convertedNotice: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.success[50],
    borderWidth: 1,
    borderColor: theme.colors.success[200],
    marginBottom: 12,
  },
  convertedNoticeTitle: { color: theme.colors.success[700], fontWeight: '900', marginBottom: 4 },
  convertedNoticeText: { color: theme.colors.text.secondary, lineHeight: 18 },
  summaryCard: { backgroundColor: theme.colors.primary[50], borderRadius: 8, padding: 16, borderWidth: 1, borderColor: theme.colors.primary[100], marginTop: 14, marginBottom: 14 },
  summaryTitle: { color: theme.colors.text.primary, fontWeight: '900', fontSize: 18 },
  summarySub: { color: theme.colors.text.secondary, marginTop: 4 },
  summaryAmount: { color: theme.colors.primary[700], fontWeight: '900', fontSize: 22, marginTop: 10 },
  totalCorrection: { marginTop: 14 },
  summaryMetaRow: { flexDirection: 'row', gap: 16, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderColor: theme.colors.primary[100] },
  summaryMetaBadge: { flex: 1 },
  summaryMetaLabel: { color: theme.colors.text.secondary, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  summaryMetaValue: { color: theme.colors.text.primary, fontSize: 14, fontWeight: '800' },
  missingAmountCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.warning[50],
    borderWidth: 1,
    borderColor: theme.colors.warning[200],
  },
  missingAmountTitle: { color: theme.colors.warning[800], fontWeight: '900', marginBottom: 6 },
  missingAmountText: { color: theme.colors.text.secondary, lineHeight: 18 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 17, marginBottom: 10 },
  addText: { color: theme.colors.primary[700], fontWeight: '800' },
  rawCard: { padding: 14, borderRadius: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.neutral[200] },
  rawText: { color: theme.colors.text.secondary, lineHeight: 20 },
  focusInfoCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    marginBottom: 14,
  },
  focusInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  focusInfoTitle: { color: theme.colors.primary[800], fontWeight: '900', fontSize: 15, flex: 1, paddingRight: 10 },
  focusInfoText: { color: theme.colors.text.secondary, lineHeight: 18 },
  overlayActionCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    marginBottom: 14,
  },
  bulkCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    marginBottom: 12,
  },
  bulkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  bulkTitle: { color: theme.colors.primary[800], fontWeight: '800', fontSize: 15 },
  bulkClear: { color: theme.colors.primary[700], fontWeight: '800' },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  filterButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
  },
  filterButtonActive: {
    borderColor: theme.colors.primary[600],
    backgroundColor: theme.colors.primary[50],
  },
  filterButtonText: { color: theme.colors.text.primary, fontWeight: '700', textAlign: 'center' },
  filterButtonTextActive: { color: theme.colors.primary[700] },
  itemCard: { backgroundColor: theme.colors.surface, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: theme.colors.neutral[200], marginBottom: 10 },
  itemFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderColor: theme.colors.neutral[200] },
  deleteItemButton: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  originalName: { color: theme.colors.text.secondary, fontSize: 12, marginBottom: 8 },
  nameSuggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  nameSuggestionText: { color: theme.colors.primary[700], fontSize: 13, fontWeight: '700', flexShrink: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48%' },
  itemIndex: { color: theme.colors.text.secondary, fontWeight: '700' },
  itemHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  itemNumberBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[50],
    marginRight: 10,
  },
  itemNumberBadgeText: { color: theme.colors.primary[700], fontWeight: '800' },
  itemAmountBlock: { alignItems: 'flex-end', minWidth: 94, marginLeft: 8 },
  itemAmount: { color: theme.colors.text.primary, fontWeight: '900', fontSize: 15 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  itemIconButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  itemSubText: { color: theme.colors.text.secondary, fontSize: 12, marginTop: 2 },
  editText: { color: theme.colors.primary[700], fontWeight: '800' },
  itemOwnerPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.warning[100],
  },
  itemOwnerPillShared: {
    backgroundColor: theme.colors.success[100],
  },
  itemOwnerPillText: {
    color: theme.colors.warning[800],
    fontWeight: '800',
    fontSize: 12,
  },
  itemOwnerPillSharedText: {
    color: theme.colors.success[800],
  },
  selectButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
  },
  selectButtonActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  selectButtonText: { color: theme.colors.text.primary, fontWeight: '700', fontSize: 12 },
  selectButtonTextActive: { color: theme.colors.text.onPrimary },
  removeText: { color: theme.colors.error[600], fontWeight: '800' },
  itemName: { color: theme.colors.text.primary, fontWeight: '800', fontSize: 15 },
  itemStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  itemStatBox: { flex: 1, borderRadius: 12, padding: 10, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.neutral[200] },
  itemStatLabel: { color: theme.colors.text.secondary, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  itemStatValue: { color: theme.colors.text.primary, fontWeight: '800', fontSize: 13 },
  assignmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingTop: 10,
  },
  assignmentIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary[50], marginRight: 10 },
  assignmentBody: { flex: 1, minWidth: 0 },
  assignmentLabel: { color: theme.colors.text.secondary, fontSize: 11, fontWeight: '700' },
  assignmentValue: { color: theme.colors.text.primary, fontSize: 14, fontWeight: '800', marginTop: 2 },
  quickAssignRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  quickAssignButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.neutral[100],
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  quickAssignButtonActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  quickAssignText: {
    color: theme.colors.text.primary,
    fontWeight: '700',
    maxWidth: 120,
  },
  quickAssignTextActive: {
    color: theme.colors.text.onPrimary,
  },
  personalOwnerBadge: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.warning[100],
  },
  personalOwnerText: { color: theme.colors.warning[800], fontWeight: '800' },
  memberSelectList: { borderWidth: 1, borderColor: theme.colors.neutral[200], borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
  memberSelectRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.neutral[100], backgroundColor: theme.colors.surface },
  memberSelectIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary[50], marginRight: 10 },
  memberAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary[100], marginRight: 10 },
  memberAvatarText: { color: theme.colors.primary[700], fontWeight: '900' },
  memberSelectName: { flex: 1, color: theme.colors.text.primary, fontWeight: '800', fontSize: 14 },
  memberSelectMeta: { color: theme.colors.text.secondary, fontSize: 12, marginTop: 2 },
  input: { borderWidth: 1, borderColor: theme.colors.neutral[200], borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, color: theme.colors.text.primary, backgroundColor: theme.colors.background, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 999, backgroundColor: theme.colors.neutral[100], marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: theme.colors.primary[600] },
  chipText: { color: theme.colors.text.primary, fontWeight: '700' },
  chipTextActive: { color: theme.colors.text.onPrimary },
  secondaryButton: { borderRadius: 14, borderWidth: 1, borderColor: theme.colors.neutral[200], paddingVertical: 15, alignItems: 'center', marginBottom: 10 },
  secondaryButtonText: { color: theme.colors.text.primary, fontWeight: '800' },
  primaryButton: { borderRadius: 14, backgroundColor: theme.colors.primary[600], paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: theme.colors.text.onPrimary, fontWeight: '900' },
  deleteReceiptButton: { paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  deleteReceiptButtonText: { color: theme.colors.error[700], fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.28)' },
  modalSheet: { backgroundColor: theme.colors.surface, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 26, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: theme.colors.neutral[200] },
  modalContent: { paddingBottom: Platform.OS === 'ios' ? 28 : 40 },
  modalTitle: { color: theme.colors.text.primary, fontSize: 18, fontWeight: '900', marginBottom: 6 },
  modalHint: { color: theme.colors.text.secondary, lineHeight: 18, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalSecondaryButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.neutral[200] },
  modalSecondaryButtonText: { color: theme.colors.text.primary, fontWeight: '800' },
  modalPrimaryButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: theme.colors.primary[600] },
  modalPrimaryButtonText: { color: theme.colors.text.onPrimary, fontWeight: '800' },
  assignmentModalRoot: { flex: 1, justifyContent: 'flex-end' },
  assignmentModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.38)' },
  assignmentModalSheet: { maxHeight: '78%', backgroundColor: theme.colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: theme.colors.neutral[200], paddingHorizontal: 16, paddingTop: 8 },
  assignmentModalHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: theme.colors.neutral[300], marginBottom: 14 },
  assignmentModalHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  assignmentModalTitleBlock: { flex: 1, paddingRight: 12 },
  modalCloseButton: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.neutral[100] },
  selectAllRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.primary[200], backgroundColor: theme.colors.primary[50], marginBottom: 8 },
  assignmentMemberScroll: { maxHeight: 320, borderWidth: 1, borderColor: theme.colors.neutral[200], borderRadius: 8 },
  assignmentMemberContent: { paddingBottom: 1 },
  assignmentModalFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 14 },
  assignmentSelectionSummary: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  assignmentSelectionCount: { color: theme.colors.text.primary, fontSize: 20, fontWeight: '900' },
  assignmentSelectionLabel: { color: theme.colors.text.secondary, fontSize: 13, fontWeight: '700' },
  assignmentSaveButton: { minWidth: 132, minHeight: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary[700] },
  assignmentSaveButtonDisabled: { opacity: 0.42 },
  assignmentSaveButtonText: { color: theme.colors.text.onPrimary, fontWeight: '900', fontSize: 15 },
});
