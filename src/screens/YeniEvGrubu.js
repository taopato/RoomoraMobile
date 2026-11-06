import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { houseApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { PageHeader, PrimaryButton } from '../shared/ui/roomora/CanonicalUI';
import KeyboardAwareScreen from '../shared/ui/KeyboardAwareScreen';
import { Alert, Text, TextInput, TouchableOpacity } from '../shared/i18n';

const GROUP_TYPES = [
  { value: 'Home', icon: 'home-outline', title: 'Ortak Ev', description: 'Faturalar, notlar ve ortak giderler' },
  { value: 'Trip', icon: 'airplane-outline', title: 'Gezi', description: 'Tatil ve seyahat harcamaları' },
];

export default function YeniEvGrubu({ navigation }) {
  const { user, setDefaultHouseId } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const [name, setName] = useState('');
  const [groupType, setGroupType] = useState('Home');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    const value = name.trim();
    if (value.length < 2) {
      Alert.alert('Grup adı gerekli', 'Grup için en az iki karakterlik bir ad yaz.');
      return;
    }
    setSaving(true);
    try {
      const response = await houseApi.createHouse({ name: value, creatorUserId: Number(user.id), groupType });
      const house = response?.data?.data ?? response?.data ?? {};
      if (house?.id) await setDefaultHouseId(house.id, house.name || value, house.groupType || groupType);
      Alert.alert(groupType === 'Trip' ? 'Gezi oluşturuldu' : 'Ev oluşturuldu', `${value} artık kullanıma hazır.`, [
        { text: 'Tamam', onPress: () => navigation.navigate('MainTabs') },
      ]);
    } catch (error) {
      Alert.alert('Grup oluşturulamadı', error?.response?.data?.message || 'Lütfen tekrar dene.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAwareScreen contentContainerStyle={styles.content} bottomOffset={44}>
        <PageHeader title="Yeni Grup Oluştur" subtitle="Grubunun kullanım şeklini seç" onBack={() => navigation.goBack()} />
        <View style={styles.typeGrid}>
          {GROUP_TYPES.map((option) => {
            const active = groupType === option.value;
            return (
              <TouchableOpacity key={option.value} style={[styles.typeCard, active && styles.typeCardActive]} onPress={() => setGroupType(option.value)} activeOpacity={0.86}>
                <Ionicons name={option.icon} size={28} color={active ? theme.colors.primary[700] : theme.colors.text.secondary} />
                <Text style={[styles.typeTitle, active && styles.typeTitleActive]}>{option.title}</Text>
                <Text style={styles.typeDescription}>{option.description}</Text>
                {active && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary[600]} style={styles.typeCheck} />}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.label}>{groupType === 'Trip' ? 'Gezi Adı' : 'Ev Adı'}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={groupType === 'Trip' ? 'Örn. Kapadokya Gezisi' : 'Örn. Kadıköy Evi'}
          placeholderTextColor={theme.colors.neutral[400]}
          style={styles.input}
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={create}
        />
        <Text style={styles.hint}>Bu ad yalnızca grup üyeleri tarafından görülecek.</Text>
        <View style={styles.footer}>
          <PrimaryButton label={saving ? 'Oluşturuluyor...' : groupType === 'Trip' ? 'Geziyi Oluştur' : 'Evi Oluştur'} icon="checkmark" onPress={create} disabled={saving} />
        </View>
      </KeyboardAwareScreen>
    </View>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, paddingTop: insets.top + 6, paddingHorizontal: 18, paddingBottom: insets.bottom + 18 },
  typeGrid: { flexDirection: 'row', gap: 10, marginTop: 26, marginBottom: 24 },
  typeCard: { flex: 1, minHeight: 144, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.neutral[200], backgroundColor: theme.colors.surface, padding: 14, justifyContent: 'center' },
  typeCardActive: { borderColor: theme.colors.primary[500], backgroundColor: theme.colors.primary[50] },
  typeTitle: { color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 16, marginTop: 9 },
  typeTitleActive: { color: theme.colors.primary[800] },
  typeDescription: { color: theme.colors.text.secondary, fontFamily: theme.typography.regular, fontSize: 11, lineHeight: 15, marginTop: 4 },
  typeCheck: { position: 'absolute', right: 10, top: 10 },
  label: { color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 14, marginBottom: 8 },
  input: { height: 54, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.neutral[300], backgroundColor: theme.colors.surface, color: theme.colors.text.primary, fontFamily: theme.typography.regular, fontSize: 16, paddingHorizontal: 15 },
  hint: { color: theme.colors.text.secondary, fontFamily: theme.typography.regular, fontSize: 12, marginTop: 8 },
  footer: { marginTop: 'auto' },
});
