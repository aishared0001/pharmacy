import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import ProductArt from '../../components/ProductArt';
import { Button, Field } from '../../components/ui';
import {
  createProduct,
  updateProduct,
  fetchProduct,
  fetchCategories,
} from '../../lib/api';
import { uploadProductImage } from '../../lib/storage';
import type { Category, ProductForm } from '../../lib/types';
import { colors, font, radius, spacing } from '../../constants/theme';

const FORMS: ProductForm[] = [
  'tablet', 'capsule', 'syrup', 'drops', 'tube',
  'injection', 'sachet', 'spray', 'inhaler', 'device', 'generic',
];

export default function ProductEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const isEdit = !!id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [generic, setGeneric] = useState('');
  const [brand, setBrand] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [pack, setPack] = useState('');
  const [rx, setRx] = useState(false);
  const [inStock, setInStock] = useState(true);
  const [form, setForm] = useState<ProductForm>('tablet');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [uses, setUses] = useState('');
  const [sideEffects, setSideEffects] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit product' : 'Add product' });
  }, [navigation, isEdit]);

  useEffect(() => {
    (async () => {
      const cats = await fetchCategories();
      setCategories(cats);
      if (!isEdit && cats[0]) setCategoryId(cats[0].id);
      if (isEdit) {
        const p = await fetchProduct(String(id));
        if (p) {
          setName(p.name);
          setGeneric(p.generic_name ?? '');
          setBrand(p.brand ?? '');
          setManufacturer(p.manufacturer ?? '');
          setCategoryId(p.category_id);
          setPrice(String(p.price));
          setMrp(String(p.mrp));
          setPack(p.pack_size ?? '');
          setRx(p.prescription_required);
          setInStock(p.in_stock);
          setForm(p.form);
          setImageUrl(p.image_url);
          setDescription(p.description ?? '');
          setUses(p.uses ?? '');
          setSideEffects(p.side_effects ?? '');
        }
      }
    })();
  }, [id, isEdit]);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUrl(result.assets[0].uri); // local uri; uploaded on save
    }
  }

  async function onSave() {
    setError(null);
    if (!name.trim() || !categoryId || !price || !mrp) {
      setError('Name, category, price and MRP are required.');
      return;
    }
    setLoading(true);
    try {
      // If image is a local file uri, upload it first.
      let finalImageUrl: string | null = imageUrl;
      const isLocal = imageUrl && (imageUrl.startsWith('file:') || imageUrl.startsWith('content:'));

      const base = {
        name: name.trim(),
        generic_name: generic.trim() || null,
        brand: brand.trim() || null,
        manufacturer: manufacturer.trim() || null,
        category_id: categoryId,
        price: Number(price),
        mrp: Number(mrp),
        pack_size: pack.trim() || null,
        prescription_required: rx,
        in_stock: inStock,
        form,
        description: description.trim() || null,
        uses: uses.trim() || null,
        side_effects: sideEffects.trim() || null,
      };

      if (isEdit) {
        if (isLocal) finalImageUrl = await uploadProductImage(String(id), imageUrl!);
        await updateProduct(String(id), { ...base, image_url: finalImageUrl });
      } else {
        // create first (without image), then upload + patch to get the id path.
        const created = await createProduct({ ...base, image_url: null });
        if (isLocal) {
          finalImageUrl = await uploadProductImage(created.id, imageUrl!);
          await updateProduct(created.id, { image_url: finalImageUrl });
        }
      }
      router.back();
    } catch (e: any) {
      setError(e?.message ?? 'Could not save the product.');
    } finally {
      setLoading(false);
    }
  }

  const showLocal = imageUrl && (imageUrl.startsWith('file:') || imageUrl.startsWith('content:') || imageUrl.startsWith('http'));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <View style={styles.imageWrap}>
          {showLocal ? (
            <Image source={{ uri: imageUrl! }} style={styles.image} contentFit="cover" />
          ) : (
            <ProductArt form={form} size={110} />
          )}
          <Pressable onPress={pickImage}>
            <Text style={styles.link}>{imageUrl ? 'Change photo' : 'Upload real photo'}</Text>
          </Pressable>
          <Text style={styles.hint}>
            No photo? A {form} illustration is used automatically.
          </Text>
        </View>

        <Field label="Name *" value={name} onChangeText={setName} />
        <Field label="Composition / salt" value={generic} onChangeText={setGeneric} />
        <Field label="Brand" value={brand} onChangeText={setBrand} />
        <Field label="Manufacturer" value={manufacturer} onChangeText={setManufacturer} />

        <Text style={styles.label}>Category *</Text>
        <View style={styles.chipRow}>
          {categories.map((c) => (
            <Chip key={c.id} label={c.name} active={c.id === categoryId} onPress={() => setCategoryId(c.id)} />
          ))}
        </View>

        <Text style={styles.label}>Form (illustration)</Text>
        <View style={styles.chipRow}>
          {FORMS.map((f) => (
            <Chip key={f} label={f} active={f === form} onPress={() => setForm(f)} />
          ))}
        </View>

        <View style={styles.two}>
          <View style={{ flex: 1 }}>
            <Field label="Price (₹) *" value={price} onChangeText={setPrice} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="MRP (₹) *" value={mrp} onChangeText={setMrp} keyboardType="numeric" />
          </View>
        </View>
        <Field label="Pack size" value={pack} onChangeText={setPack} placeholder="e.g. 15 tablets" />

        <Field
          label="About / description"
          value={description}
          onChangeText={setDescription}
          multiline
          style={styles.multiline}
        />
        <Field label="Used for" value={uses} onChangeText={setUses} multiline style={styles.multiline} />
        <Field
          label="Common side effects"
          value={sideEffects}
          onChangeText={setSideEffects}
          multiline
          style={styles.multiline}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Prescription required</Text>
          <Switch value={rx} onValueChange={setRx} trackColor={{ true: colors.rxBadge }} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>In stock</Text>
          <Switch value={inStock} onValueChange={setInStock} trackColor={{ true: colors.primary }} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={isEdit ? 'Save changes' : 'Create product'} onPress={onSave} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  imageWrap: { alignItems: 'center', marginBottom: spacing.lg, gap: spacing.xs },
  image: { width: 120, height: 120, borderRadius: radius.md },
  link: { color: colors.primary, fontWeight: '700', marginTop: spacing.sm },
  hint: { color: colors.textMuted, fontSize: font.tiny },
  label: { fontSize: font.small, color: colors.textMuted, marginBottom: spacing.xs, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: font.small, textTransform: 'capitalize' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  two: { flexDirection: 'row', gap: spacing.md },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  switchLabel: { fontSize: font.body, color: colors.text, fontWeight: '600' },
  error: { color: colors.danger, marginBottom: spacing.md },
});
