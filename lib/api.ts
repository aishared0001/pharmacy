import { supabase } from './supabase';
import type { Address, Category, Order, Product, Profile } from './types';
import type { CartLine } from './cart-store';

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data as Category[]) ?? [];
}

export type ProductSort = 'name' | 'price_asc' | 'price_desc';
export type RxFilter = 'all' | 'rx' | 'otc';

export async function fetchProducts(opts?: {
  categoryId?: string;
  search?: string;
  limit?: number;
  sort?: ProductSort;
  rx?: RxFilter;
}): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('in_stock', true);

  // Sort
  const sort = opts?.sort ?? 'name';
  if (sort === 'price_asc') query = query.order('price', { ascending: true });
  else if (sort === 'price_desc') query = query.order('price', { ascending: false });
  else query = query.order('name', { ascending: true });

  if (opts?.categoryId) query = query.eq('category_id', opts.categoryId);

  // Rx / OTC filter
  if (opts?.rx === 'rx') query = query.eq('prescription_required', true);
  else if (opts?.rx === 'otc') query = query.eq('prescription_required', false);

  // Search also matches the salt and what the medicine is used for (symptoms).
  if (opts?.search && opts.search.trim()) {
    const term = `%${opts.search.trim()}%`;
    query = query.or(
      `name.ilike.${term},generic_name.ilike.${term},brand.ilike.${term},` +
        `uses.ilike.${term},description.ilike.${term}`,
    );
  }
  if (opts?.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data as Product[]) ?? [];
}

// Fetch current product rows for a set of ids (used by Reorder).
export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .in('id', ids);
  if (error) throw error;
  return (data as Product[]) ?? [];
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Product) ?? null;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function upsertProfile(
  id: string,
  fields: Partial<Pick<Profile, 'full_name' | 'phone'>>,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Saved addresses
// ---------------------------------------------------------------------------

export type AddressInput = {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string | null;
  landmark?: string | null;
  pincode: string;
  is_default?: boolean;
};

export async function fetchAddresses(): Promise<Address[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Address[]) ?? [];
}

export async function createAddress(userId: string, input: AddressInput): Promise<Address> {
  const makeDefault = input.is_default ?? false;
  if (makeDefault) await clearDefaultAddresses(userId);
  const { data, error } = await supabase
    .from('addresses')
    .insert({
      user_id: userId,
      full_name: input.full_name,
      phone: input.phone,
      address_line1: input.address_line1,
      address_line2: input.address_line2 ?? null,
      landmark: input.landmark ?? null,
      city: 'Chandigarh',
      pincode: input.pincode,
      is_default: makeDefault,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Address;
}

export async function deleteAddress(id: string): Promise<void> {
  const { error } = await supabase.from('addresses').delete().eq('id', id);
  if (error) throw error;
}

async function clearDefaultAddresses(userId: string): Promise<void> {
  await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId);
}

export async function setDefaultAddress(userId: string, id: string): Promise<void> {
  await clearDefaultAddresses(userId);
  const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export type CheckoutAddress = {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  landmark?: string;
  pincode: string;
};

export type PlaceOrderInput = {
  userId: string;
  lines: CartLine[];
  address: CheckoutAddress;
  subtotal: number;
  deliveryFee: number;
  prescriptionUrl?: string | null;
};

/**
 * Inserts the order + its items, then invokes the send-order-email Edge
 * Function. Email failure is swallowed (order is already placed) but logged.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  const total = input.subtotal + input.deliveryFee;

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      user_id: input.userId,
      status: 'placed',
      subtotal: input.subtotal,
      delivery_fee: input.deliveryFee,
      total,
      full_name: input.address.full_name,
      phone: input.address.phone,
      address_line1: input.address.address_line1,
      address_line2: input.address.address_line2 ?? null,
      landmark: input.address.landmark ?? null,
      city: 'Chandigarh',
      pincode: input.address.pincode,
      prescription_url: input.prescriptionUrl ?? null,
      payment_method: 'COD',
    })
    .select()
    .single();

  if (error) throw error;

  // Guard against stale cart items (e.g. after the catalogue was re-seeded and
  // product ids changed): link only to product ids that still exist, and keep
  // the name/price snapshot either way so the order is never rejected.
  const cartProductIds = input.lines.map((l) => l.product.id);
  let validIds = new Set<string>();
  try {
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .in('id', cartProductIds);
    validIds = new Set((existing ?? []).map((p: { id: string }) => p.id));
  } catch {
    // If the lookup fails, fall back to storing items without a product link.
  }

  const items = input.lines.map((l) => ({
    order_id: (order as Order).id,
    product_id: validIds.has(l.product.id) ? l.product.id : null,
    name: l.product.name,
    price: l.product.price,
    quantity: l.quantity,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(items);
  if (itemsError) throw itemsError;

  // Fire the notification email. Do not fail the order if this errors.
  try {
    await supabase.functions.invoke('send-order-email', {
      body: { order_id: (order as Order).id },
    });
  } catch (e) {
    console.warn('[MediGo] send-order-email failed (order still placed):', e);
  }

  return order as Order;
}

export async function fetchMyOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Order[]) ?? [];
}

export async function fetchOrder(id: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Order) ?? null;
}

// ---------------------------------------------------------------------------
// Admin (guarded by RLS: only profiles.is_admin can write)
// ---------------------------------------------------------------------------

export type ProductInput = {
  name: string;
  generic_name?: string | null;
  brand?: string | null;
  manufacturer?: string | null;
  category_id: string;
  price: number;
  mrp: number;
  pack_size?: string | null;
  prescription_required: boolean;
  in_stock: boolean;
  form: string;
  image_url?: string | null;
  description?: string | null;
  uses?: string | null;
  side_effects?: string | null;
};

export async function fetchAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data as Product[]) ?? [];
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data, error } = await supabase.from('products').insert(input).select().single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<void> {
  const { error } = await supabase.from('products').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchAllOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Order[]) ?? [];
}

export async function updateOrderStatus(id: string, status: Order['status']): Promise<void> {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  if (error) throw error;
  // Notify the customer by push (non-fatal if it fails or isn't set up yet).
  try {
    await supabase.functions.invoke('notify-order-status', { body: { order_id: id } });
  } catch (e) {
    console.warn('[MediGo] notify-order-status failed:', e);
  }
}
