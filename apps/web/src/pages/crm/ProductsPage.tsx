import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Package,
  Plus,
  Search,
  Laptop,
  CheckCircle2,
  Calendar,
  Layers,
  Barcode,
  Loader2,
  Tag,
  ShieldCheck,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description?: string;
  _count?: { products: number };
}

interface Product {
  id: string;
  sku: string;
  name: string;
  modelNumber?: string;
  description?: string;
  defaultWarrantyMonths: number;
  category?: Category;
  _count?: {
    registrations: number;
    serialNumbers: number;
  };
}

interface CustomerOption {
  id: string;
  name: string;
  customerCode: string;
}

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Dialogs
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [registerAssetOpen, setRegisterAssetOpen] = useState(false);

  // New Product Form
  const [productForm, setProductForm] = useState({
    sku: '',
    name: '',
    modelNumber: '',
    description: '',
    defaultWarrantyMonths: 12,
    categoryId: '',
  });
  const [productSubmitting, setProductSubmitting] = useState(false);

  // Register Asset Form
  const [registerForm, setRegisterForm] = useState({
    customerId: '',
    productId: '',
    serialNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    sellerName: '',
    invoiceNumber: '',
    warrantyMonths: 12,
  });
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, custRes] = await Promise.all([
        api.get('/crm/products', {
          params: {
            categoryId: categoryFilter || undefined,
            search: search || undefined,
          },
        }),
        api.get('/crm/categories'),
        api.get('/crm/customers', { params: { limit: 100 } }),
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
      setCustomers(
        custRes.data.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          customerCode: c.customerCode,
        })),
      );
    } catch (err) {
      console.error('Failed to load products/categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, categoryFilter]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProductSubmitting(true);
      await api.post('/crm/products', {
        sku: productForm.sku,
        name: productForm.name,
        modelNumber: productForm.modelNumber || undefined,
        description: productForm.description || undefined,
        defaultWarrantyMonths: Number(productForm.defaultWarrantyMonths) || 12,
        categoryId: productForm.categoryId || undefined,
      });
      setCreateProductOpen(false);
      setProductForm({
        sku: '',
        name: '',
        modelNumber: '',
        description: '',
        defaultWarrantyMonths: 12,
        categoryId: '',
      });
      fetchData();
    } catch (err) {
      console.error('Failed to create product:', err);
    } finally {
      setProductSubmitting(false);
    }
  };

  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setRegisterSubmitting(true);
      const res = await api.post('/crm/products/register', {
        customerId: registerForm.customerId,
        productId: registerForm.productId,
        serialNumber: registerForm.serialNumber,
        purchaseDate: new Date(registerForm.purchaseDate).toISOString(),
        sellerName: registerForm.sellerName || undefined,
        invoiceNumber: registerForm.invoiceNumber || undefined,
        warrantyMonths: Number(registerForm.warrantyMonths),
      });
      setRegistrationSuccess(res.data);
      setRegisterForm({
        customerId: '',
        productId: '',
        serialNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        sellerName: '',
        invoiceNumber: '',
        warrantyMonths: 12,
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to register product');
    } finally {
      setRegisterSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-poppins text-ink tracking-tight flex items-center gap-2.5">
            <Package className="w-6 h-6 text-primary" />
            Product Catalog & Serialized Assets
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Manage product models, OEM warranty parameters, manufacturing batches, and asset registration.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => {
              setRegistrationSuccess(null);
              setRegisterAssetOpen(true);
            }}
            className="border-primary/40 text-primary hover:bg-primary/5 flex items-center gap-1.5"
          >
            <Barcode className="w-4 h-4" />
            Register Asset
          </Button>
          <Button
            onClick={() => setCreateProductOpen(true)}
            className="bg-primary hover:bg-primary-hover text-white shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-white border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">Product Models</p>
              <p className="text-2xl font-bold font-poppins text-ink mt-0.5">{products.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Package className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">Categories</p>
              <p className="text-2xl font-bold font-poppins text-ink mt-0.5">{categories.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">Active Registrations</p>
              <p className="text-2xl font-bold font-poppins text-emerald-700 mt-0.5">
                {products.reduce((acc, p) => acc + (p._count?.registrations || 0), 0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">Batch Serials Tracked</p>
              <p className="text-2xl font-bold font-poppins text-ink mt-0.5">
                {products.reduce((acc, p) => acc + (p._count?.serialNumbers || 0), 0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Barcode className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter toolbar */}
      <Card className="bg-white border-border/70 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU, product name, or model..."
              className="pl-9 bg-[#FAF9F6] border-border/80 text-sm"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-md border border-border/80 bg-[#FAF9F6] text-ink focus:outline-none w-full md:w-auto"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Product Catalog Grid */}
      {loading ? (
        <div className="py-16 text-center text-ink-muted">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          Loading product catalog...
        </div>
      ) : products.length === 0 ? (
        <Card className="bg-white border-border/70 p-12 text-center text-ink-muted">
          <Package className="w-10 h-10 mx-auto mb-2 text-zinc-300" />
          <p className="font-poppins font-semibold text-ink">No product models found</p>
          <p className="text-xs text-ink-muted mt-1">Get started by creating your first product model.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <Card
              key={p.id}
              className="bg-white border-border/70 hover:border-border transition-all duration-200 shadow-sm flex flex-col justify-between"
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-semibold text-ink-soft">
                    {p.sku}
                  </span>
                  {p.category && (
                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                      {p.category.name}
                    </Badge>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-base font-poppins text-ink leading-snug">
                    {p.name}
                  </h3>
                  {p.modelNumber && (
                    <p className="text-xs text-ink-muted font-mono mt-0.5">
                      Model: {p.modelNumber}
                    </p>
                  )}
                </div>

                <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                  {p.description || 'Standard enterprise hardware specification.'}
                </p>

                <div className="pt-3 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[11px] text-ink-muted block">OEM Warranty</span>
                    <span className="font-semibold text-ink font-mono">
                      {p.defaultWarrantyMonths} Months
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-ink-muted block">Registered Units</span>
                    <span className="font-semibold text-emerald-700 font-mono">
                      {p._count?.registrations || 0} Assets
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Register Asset Dialog */}
      <Dialog open={registerAssetOpen} onOpenChange={setRegisterAssetOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-poppins text-ink">Register Hardware Asset</DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Bind a manufactured serial number to a customer and issue an active warranty certificate.
            </DialogDescription>
          </DialogHeader>

          {registrationSuccess ? (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <div>
                <p className="font-bold font-poppins text-emerald-900">Registration Complete!</p>
                <p className="text-xs text-emerald-700 mt-1">
                  Serial <span className="font-mono font-bold">{registrationSuccess.registration.serialNumber}</span> has been assigned to{' '}
                  <span className="font-semibold">{registrationSuccess.customer.name}</span>.
                </p>
                <p className="text-xs font-mono font-semibold text-emerald-800 mt-2">
                  Warranty No: {registrationSuccess.warranty.warrantyNumber}
                </p>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                onClick={() => setRegisterAssetOpen(false)}
              >
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRegisterAsset} className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Select Customer *</Label>
                <select
                  required
                  value={registerForm.customerId}
                  onChange={(e) => setRegisterForm({ ...registerForm, customerId: e.target.value })}
                  className="w-full h-8 px-2 text-xs rounded-md border border-border/80 bg-[#FAF9F6] text-ink"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.customerCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Product Model *</Label>
                <select
                  required
                  value={registerForm.productId}
                  onChange={(e) => {
                    const sel = products.find((p) => p.id === e.target.value);
                    setRegisterForm({
                      ...registerForm,
                      productId: e.target.value,
                      warrantyMonths: sel?.defaultWarrantyMonths || 12,
                    });
                  }}
                  className="w-full h-8 px-2 text-xs rounded-md border border-border/80 bg-[#FAF9F6] text-ink"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} [{p.sku}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Hardware Serial Number *</Label>
                <Input
                  required
                  value={registerForm.serialNumber}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, serialNumber: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g. SN-LEN-882103"
                  className="h-8 text-xs font-mono uppercase bg-[#FAF9F6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Purchase Date *</Label>
                  <Input
                    type="date"
                    required
                    value={registerForm.purchaseDate}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, purchaseDate: e.target.value })
                    }
                    className="h-8 text-xs bg-[#FAF9F6]"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Warranty Duration</Label>
                  <Input
                    type="number"
                    value={registerForm.warrantyMonths}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        warrantyMonths: Number(e.target.value),
                      })
                    }
                    placeholder="Months"
                    className="h-8 text-xs bg-[#FAF9F6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Seller / Vendor</Label>
                  <Input
                    value={registerForm.sellerName}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, sellerName: e.target.value })
                    }
                    placeholder="e.g. Chroma / Croma"
                    className="h-8 text-xs bg-[#FAF9F6]"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Invoice Number</Label>
                  <Input
                    value={registerForm.invoiceNumber}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, invoiceNumber: e.target.value })
                    }
                    placeholder="INV-2026-XXXX"
                    className="h-8 text-xs bg-[#FAF9F6]"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRegisterAssetOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={registerSubmitting}
                  className="bg-primary hover:bg-primary-hover text-white"
                >
                  {registerSubmitting ? 'Registering...' : 'Confirm Registration'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Product Dialog */}
      <Dialog open={createProductOpen} onOpenChange={setCreateProductOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-poppins text-ink">Add Product Model</DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Add a new hardware SKU to the master catalog with warranty parameters.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProduct} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">SKU Code *</Label>
                <Input
                  required
                  value={productForm.sku}
                  onChange={(e) =>
                    setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g. ORBIT-TAB-12"
                  className="h-8 text-xs font-mono uppercase bg-[#FAF9F6]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <select
                  value={productForm.categoryId}
                  onChange={(e) =>
                    setProductForm({ ...productForm, categoryId: e.target.value })
                  }
                  className="w-full h-8 px-2 text-xs rounded-md border border-border/80 bg-[#FAF9F6] text-ink"
                >
                  <option value="">-- None --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Product Name *</Label>
              <Input
                required
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="e.g. ORBIT Tab Ultra 12.4 inch"
                className="h-8 text-xs bg-[#FAF9F6]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Model Number</Label>
                <Input
                  value={productForm.modelNumber}
                  onChange={(e) => setProductForm({ ...productForm, modelNumber: e.target.value })}
                  placeholder="OT-12-OLED"
                  className="h-8 text-xs bg-[#FAF9F6]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Default Warranty (Months)</Label>
                <Input
                  type="number"
                  value={productForm.defaultWarrantyMonths}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      defaultWarrantyMonths: Number(e.target.value),
                    })
                  }
                  placeholder="12"
                  className="h-8 text-xs bg-[#FAF9F6]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description / Specifications</Label>
              <Input
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Snapdragon X Elite, 16GB, 512GB, 5G LTE"
                className="h-8 text-xs bg-[#FAF9F6]"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateProductOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={productSubmitting}
                className="bg-primary hover:bg-primary-hover text-white"
              >
                {productSubmitting ? 'Saving...' : 'Save Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
