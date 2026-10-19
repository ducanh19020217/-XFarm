'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PaymentMethod, createSalesOrderSchema } from '@xfarm/shared';
import { Button, Input, Label, PageHeader, Select, Toast, useToast } from '@xfarm/ui';
import { ArrowLeft, Plus, Trash2, UserPlus, ShoppingCart } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { MoneyInput } from '@/components/ui/money-input';
import type { CustomerRecord, ProductOption, SalesOrderRecord } from '../../_components/types';
import { formatCurrency, paymentMethodLabels } from '../../_components/constants';
import { CustomerFormDialog } from '../../customers/_components/customer-form-dialog';

interface OrderFormLine {
  productId: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
}

export default function NewSalesOrderPage() {
  const router = useRouter();
  const { message: toastMessage, showToast, closeToast } = useToast();

  const [customers, setCustomers] = React.useState<CustomerRecord[]>([]);
  const [products, setProducts] = React.useState<ProductOption[]>([]);
  const [loadingData, setLoadingData] = React.useState(true);

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = React.useState('');
  const [customerSearch, setCustomerSearch] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(PaymentMethod.COD);
  const [shippingAddress, setShippingAddress] = React.useState('');
  const [discount, setDiscount] = React.useState(0);
  const [shippingFee, setShippingFee] = React.useState(0);
  const [notes, setNotes] = React.useState('');

  const [lines, setLines] = React.useState<OrderFormLine[]>([
    { productId: '', itemId: '', quantity: 1, unitPrice: 0, unit: '' },
  ]);

  const [quickCustomerOpen, setQuickCustomerOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const [globalError, setGlobalError] = React.useState<string | null>(null);

  // Fetch customers and products
  const loadInitialData = React.useCallback(async () => {
    setLoadingData(true);
    try {
      const [custRes, prodRes] = await Promise.all([
        apiFetch<{ data: CustomerRecord[] } | CustomerRecord[]>('/customers?pageSize=100&isActive=true'),
        apiFetch<{ data: ProductOption[] } | ProductOption[]>('/products?pageSize=100'),
      ]);

      const custData = Array.isArray(custRes) ? custRes : custRes?.data || [];
      const prodData = Array.isArray(prodRes) ? prodRes : prodRes?.data || [];

      setCustomers(custData);
      setProducts(prodData);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu ban đầu:', err);
      showToast('Không thể tải danh sách khách hàng hoặc sản phẩm');
    } finally {
      setLoadingData(false);
    }
  }, [showToast]);

  React.useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // When customer changes, prefill shipping address
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const found = customers.find((c) => c.id === customerId);
    if (found?.address) {
      setShippingAddress(found.address);
    }
  };

  // Filtered customers for quick search
  const filteredCustomers = React.useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const term = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term),
    );
  }, [customers, customerSearch]);

  // Handle line changes
  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    setLines((prev) => {
      const next = [...prev];
      if (product) {
        next[index] = {
          ...next[index],
          productId: product.id,
          itemId: product.itemId,
          unitPrice: Number(product.price) || 0,
          unit: product.unit || '',
        };
      } else {
        next[index] = {
          ...next[index],
          productId: '',
          itemId: '',
          unitPrice: 0,
          unit: '',
        };
      }
      return next;
    });
  };

  const handleQtyChange = (index: number, qty: number) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: Math.max(1, qty) };
      return next;
    });
  };

  const handlePriceChange = (index: number, price: number) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], unitPrice: Math.max(0, price) };
      return next;
    });
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { productId: '', itemId: '', quantity: 1, unitPrice: 0, unit: '' },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations: "tổng tạm tính dùng Intl.NumberFormat('vi-VN')"
  const subtotal = React.useMemo(() => {
    return lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  }, [lines]);

  const total = React.useMemo(() => {
    return Math.max(0, subtotal - discount + shippingFee);
  }, [subtotal, discount, shippingFee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setGlobalError(null);

    // Prepare DTO
    const payload = {
      customerId: selectedCustomerId,
      paymentMethod,
      shippingAddress: shippingAddress.trim(),
      discount: Number(discount) || 0,
      shippingFee: Number(shippingFee) || 0,
      notes: notes.trim() || undefined,
      lines: lines.map((line) => ({
        productId: line.productId || undefined,
        itemId: line.itemId,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
      })),
    };

    // Client validation with Zod
    const validation = createSalesOrderSchema.safeParse(payload);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const path = issue.path.join('.');
        if (!errors[path]) errors[path] = issue.message;
      }
      setFormErrors(errors);
      if (errors.customerId) setGlobalError(errors.customerId);
      else if (errors.shippingAddress) setGlobalError(errors.shippingAddress);
      else if (errors.lines) setGlobalError(errors.lines);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch<SalesOrderRecord | { data: SalesOrderRecord }>('/sales-orders', {
        method: 'POST',
        body: JSON.stringify(validation.data),
      });
      const order = (res && 'data' in res ? res.data : res) as SalesOrderRecord;
      showToast(`Tạo đơn hàng ${order.code} thành công`);
      router.push(`/admin/sales/orders/${order.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setGlobalError(err.message || 'Lỗi khi tạo đơn hàng');
      } else {
        setGlobalError('Đã có lỗi không mong muốn xảy ra');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {toastMessage && <Toast message={toastMessage} onClose={closeToast} />}

      <div className="flex items-center gap-3">
        <Link href="/admin/sales/orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại danh sách
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Tạo đơn hàng mới"
        description="Lập đơn hàng bán tại quầy hoặc tạo đơn đặt trước cho khách hàng"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {globalError && (
          <div className="p-4 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-sm dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">
            {globalError}
          </div>
        )}

        {/* Khối chọn khách hàng */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Thông tin khách hàng
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickCustomerOpen(true)}
              className="flex items-center gap-1.5 self-start text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800"
            >
              <UserPlus className="h-4 w-4" />
              <span>Tạo nhanh khách hàng</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="customer-select">
                Chọn khách hàng <span className="text-rose-500">*</span>
              </Label>
              <div className="space-y-2">
                <Input
                  id="customer-search"
                  placeholder="Tìm nhanh theo tên, SĐT hoặc mã khách..."
                  value={customerSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCustomerSearch(e.target.value)
                  }
                  className="text-xs"
                />
                <Select
                  id="customer-select"
                  value={selectedCustomerId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    handleSelectCustomer(e.target.value)
                  }
                  disabled={loadingData}
                >
                  <option value="">-- Chọn khách hàng --</option>
                  {filteredCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) - {c.code}
                    </option>
                  ))}
                </Select>
              </div>
              {formErrors.customerId && (
                <p className="text-xs text-rose-500 mt-1">{formErrors.customerId}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="shipping-address">
                Địa chỉ giao hàng <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="shipping-address"
                value={shippingAddress}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setShippingAddress(e.target.value)
                }
                placeholder="Nhập địa chỉ giao hàng"
              />
              {formErrors.shippingAddress && (
                <p className="text-xs text-rose-500 mt-1">{formErrors.shippingAddress}</p>
              )}
            </div>
          </div>
        </div>

        {/* Khối chọn sản phẩm */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Chi tiết mặt hàng ({lines.length})
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLine}
              className="flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm dòng</span>
            </Button>
          </div>

          <div className="space-y-3">
            <div className="hidden md:grid grid-cols-12 gap-3 text-xs font-semibold text-slate-500 uppercase px-2">
              <div className="col-span-5">Sản phẩm / Hàng hóa</div>
              <div className="col-span-2">Số lượng</div>
              <div className="col-span-2">Đơn vị</div>
              <div className="col-span-2">Đơn giá</div>
              <div className="col-span-1 text-center">Xóa</div>
            </div>

            {lines.map((line, idx) => {
              const lineTotal = line.quantity * line.unitPrice;
              return (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3 rounded-lg border border-slate-100 bg-slate-50/50 dark:bg-slate-950/40 dark:border-slate-800"
                >
                  <div className="col-span-5 space-y-1">
                    <Label className="md:hidden text-xs">Sản phẩm</Label>
                    <Select
                      id={`order-line-product-${idx}`}
                      aria-label={`Sản phẩm dòng ${idx + 1}`}
                      value={line.productId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        handleProductChange(idx, e.target.value)
                      }
                    >
                      <option value="">-- Chọn sản phẩm --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.unit}) - {formatCurrency(p.price)}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="md:hidden text-xs">Số lượng</Label>
                    <Input
                      id={`order-line-qty-${idx}`}
                      aria-label={`Số lượng dòng ${idx + 1}`}
                      type="number"
                      min="1"
                      step="any"
                      value={line.quantity || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleQtyChange(idx, parseFloat(e.target.value) || 0)
                      }
                      placeholder="SL"
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="md:hidden text-xs">Đơn vị</Label>
                    <Input value={line.unit || '—'} disabled className="bg-white dark:bg-slate-900" />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="md:hidden text-xs">Đơn giá</Label>
                    <MoneyInput
                      id={`order-line-price-${idx}`}
                      aria-label={`Đơn giá dòng ${idx + 1}`}
                      value={line.unitPrice}
                      onChange={(val) => handlePriceChange(idx, val)}
                      placeholder="0"
                    />
                  </div>

                  <div className="col-span-1 flex items-center justify-center pt-2 md:pt-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(idx)}
                      disabled={lines.length <= 1}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Khối thanh toán và tổng tạm tính */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 pb-3 dark:border-slate-800">
              Phương thức thanh toán & Ghi chú
            </h2>

            <div className="space-y-1">
              <Label htmlFor="payment-method">Phương thức thanh toán</Label>
              <Select
                id="payment-method"
                value={paymentMethod}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
              >
                {Object.entries(paymentMethodLabels).map(([method, label]) => (
                  <option key={method} value={method}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="order-notes">Ghi chú đơn hàng</Label>
              <textarea
                id="order-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú thêm về đơn hàng hoặc yêu cầu của khách..."
                rows={3}
                className="w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 dark:border-slate-800 dark:focus-visible:ring-slate-300"
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 pb-3 dark:border-slate-800">
              Tổng tính tiền
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span>Tạm tính (tiền hàng):</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div className="flex justify-between items-center gap-4">
                <span className="text-slate-600 dark:text-slate-300">Chiết khấu giảm giá:</span>
                <div className="w-40">
                  <MoneyInput
                    id="order-discount"
                    value={discount}
                    onChange={(val) => setDiscount(val)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center gap-4">
                <span className="text-slate-600 dark:text-slate-300">Phí vận chuyển:</span>
                <div className="w-40">
                  <MoneyInput
                    id="order-shipping-fee"
                    value={shippingFee}
                    onChange={(val) => setShippingFee(val)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-base">
                <span className="font-bold text-slate-900 dark:text-slate-100">Tổng thanh toán:</span>
                <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Link href="/admin/sales/orders">
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Hủy
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="min-w-32">
            {isSubmitting ? 'Đang tạo đơn...' : 'Tạo đơn hàng'}
          </Button>
        </div>
      </form>

      {/* Dialog tạo nhanh khách hàng */}
      <CustomerFormDialog
        open={quickCustomerOpen}
        onOpenChange={setQuickCustomerOpen}
        title="Tạo nhanh khách hàng"
        onSuccess={(newCust) => {
          showToast(`Đã thêm khách hàng ${newCust.name}`);
          setCustomers((prev) => [newCust, ...prev]);
          handleSelectCustomer(newCust.id);
        }}
      />
    </div>
  );
}
