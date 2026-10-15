import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { cleanDecimal } from '../../utils/jobwork';
import { Button, Card, COLORS, ErrorBanner, Field, styles } from '../jobwork/common';
import { StockItemPicker } from '../jobwork/Pickers';

export const blankItem = () => ({ mode: 'stock', stock_item_id: '', description: '', unit: '', hsn: '', qty: '', unit_value: '' });

// Rows -> the body the inward / receipt APIs expect.
export const itemsPayload = (items) => items.map((r) => (r.mode === 'request'
  ? { request_stock_item: true, description: r.description, unit: r.unit, hsn: r.hsn, qty: r.qty, unit_value: r.unit_value }
  : { stock_item_id: r.stock_item_id ? Number(r.stock_item_id) : undefined, qty: r.qty, unit_value: r.unit_value, description: r.description, unit: r.unit }));

// The list of customer-material items on the inward and Add receipt forms: pick a stock item, or "Request stock item".
export default function ItemsEditor({ items, setItems, stockItems }) {
  const setItem = (i, patch) => setItems((rs) => rs.map((r, n) => (n === i ? { ...r, ...patch } : r)));
  const pickStock = (i, id) => {
    const s = stockItems.find((x) => String(x.id) === String(id));
    setItem(i, { stock_item_id: id, unit: s ? s.unit || '' : '', hsn: s ? s.hsn || '' : '', description: s ? s.name : '' });
  };
  return (
    <View>
      {items.map((r, i) => (
        <Card key={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.label}>Item {i + 1}</Text>
            {items.length > 1 ? <TouchableOpacity onPress={() => setItems((rs) => rs.filter((_, n) => n !== i))}><Text style={{ color: COLORS.danger, fontWeight: '600' }}>Remove</Text></TouchableOpacity> : null}
          </View>
          {r.mode === 'stock' ? (
            <>
              <StockItemPicker items={stockItems} value={r.stock_item_id} onChange={(v) => pickStock(i, v)} />
              <TouchableOpacity onPress={() => setItem(i, { mode: 'request', stock_item_id: '', description: '', unit: '', hsn: '' })} style={{ marginVertical: 6 }}>
                <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Not in the list? Request a stock item</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ErrorBanner kind="warning" message="Accounts will create this stock item. The material is received now and can go on a work order once the item exists." />
              <Field label="Description *" value={r.description} onChangeText={(t) => setItem(i, { description: t })} />
              <Field label="Unit *" value={r.unit} onChangeText={(t) => setItem(i, { unit: t })} placeholder="pcs, kg, nos..." />
              <Field label="HSN (if on the customer's DC)" value={r.hsn} onChangeText={(t) => setItem(i, { hsn: t })} keyboardType="numeric" />
              <TouchableOpacity onPress={() => setItem(i, { mode: 'stock', description: '', unit: '', hsn: '' })} style={{ marginBottom: 6 }}>
                <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Pick an existing stock item instead</Text>
              </TouchableOpacity>
            </>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field style={{ flex: 1 }} label={`Qty${r.unit ? ` (${r.unit})` : ''} *`} value={r.qty} keyboardType="decimal-pad" onChangeText={(t) => setItem(i, { qty: cleanDecimal(t, 3) })} />
            <Field style={{ flex: 1 }} label="Value per unit (Rs.) *" value={r.unit_value} keyboardType="decimal-pad" onChangeText={(t) => setItem(i, { unit_value: cleanDecimal(t, 2) })}
              hint="As declared on the customer's DC" />
          </View>
        </Card>
      ))}
      <Button title="+ Add another item" kind="ghost" onPress={() => setItems((rs) => [...rs, blankItem()])} />
    </View>
  );
}
