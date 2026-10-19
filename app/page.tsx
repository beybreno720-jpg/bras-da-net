'use client';

import React, { useState, useEffect } from 'react';
import { 
  Lock, Eye, EyeOff, User, ShoppingBag, 
  ChevronRight, ArrowLeft, Trash2, CheckCircle2 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Categorias e Subcategorias (conforme Rascunhos 2 e 3)
const CATEGORIES = [
  { id: 'm-shirts', name: 'Blusas Masc' },
  { id: 'f-shirts', name: 'Blusas Fem' },
  { id: 't-shirts', name: 'Camisetas' },
  { id: 'dresses', name: 'Vestidos' },
  { id: 'f-shoes', name: 'Calçados Fem' },
  { id: 'm-shoes', name: 'Calçados Masc' },
  { 
    id: 'evangelical', 
    name: 'Moda Evangélica', 
    subcategories: ['Gravatas', 'Camisas', 'Vestidos Longos', 'Vestidos Curtos'] 
  },
  { id: 'kids', name: 'Moda Infantil' },
];

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'categories' | 'cart' | 'checkout' | 'success' | 'admin' | 'supplier'>('home');
  
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[0] | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  // Estados de Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Dados do Supabase
  const [products, setProducts] = useState<any[]>([]);
  const [adminSettings, setAdminSettings] = useState({ wholesale_discount_percent: 25, platform_fee_percent: 5 });
  const [loading, setLoading] = useState(true);

  // Carrinho
  const [cart, setCart] = useState<any[]>([]);

  // Formulário de Checkout
  const [checkoutData, setCheckoutData] = useState({ address: '', name: '', document: '', whatsapp: '' });

  // Formulário do Fornecedor (Cadastro de Produto com Foto Real)
  const [newProduct, setNewProduct] = useState({
    title: '',
    category: 'f-shirts',
    subcategory: '',
    cost_price: '',
    stock: '20'
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Carregar dados ao iniciar
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: prodData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (prodData) setProducts(prodData);

      const { data: setListData } = await supabase.from('admin_settings').select('*').limit(1).single();
      if (setListData) {
        setAdminSettings({
          wholesale_discount_percent: setListData.wholesale_discount_percent,
          platform_fee_percent: setListData.platform_fee_percent
        });
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  }

  // Cadastrar produto com upload real de imagem para o Supabase Storage
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let imageUrl = '';

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrlData.publicUrl;
      }

      const cost = parseFloat(newProduct.cost_price) || 50;
      const retail = cost * 1.6; // 60% margem varejo
      const wholesale = cost * (1 + (adminSettings.wholesale_discount_percent / 100));

      const { error: insertError } = await supabase.from('products').insert([
        {
          title: newProduct.title,
          category: newProduct.category,
          subcategory: newProduct.subcategory || null,
          cost_price: cost,
          retail_price: retail,
          wholesale_price: wholesale,
          image_url: imageUrl || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500',
          stock: parseInt(newProduct.stock) || 10
        }
      ]);

      if (insertError) throw insertError;

      alert('Peça cadastrada com sucesso no Brás da Net!');
      setNewProduct({ title: '', category: 'f-shirts', subcategory: '', cost_price: '', stock: '20' });
      setImageFile(null);
      fetchData();
      setActiveTab('home');
    } catch (err: any) {
      alert('Erro ao cadastrar: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      setIsLoggedIn(true);
      setShowLoginModal(false);
    }
  };

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1, size: 'M' }];
    });
  };

  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);
  const totalPrice = cart.reduce(
    (acc, item) => acc + (isLoggedIn ? item.product.wholesale_price : item.product.retail_price) * item.qty,
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Topbar */}
      <header className="bg-blue-900 text-white p-4 shadow-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
            <ShoppingBag className="w-6 h-6 text-yellow-400" />
            <h1 className="font-extrabold text-xl tracking-wider">BRÁS DA NET</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('supplier')}
              className="bg-blue-800 text-xs px-2.5 py-1.5 rounded-lg font-bold hover:bg-blue-700 hidden sm:block"
            >
              + Cadastrar Peça
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className="bg-slate-800 text-xs px-2.5 py-1.5 rounded-lg font-bold hover:bg-slate-700 hidden sm:block"
            >
              ⚙️ Admin
            </button>
            {isLoggedIn ? (
              <span className="bg-emerald-600 text-xs px-3 py-1 rounded-full font-bold">
                Atacado Liberado
              </span>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="bg-yellow-400 text-blue-950 font-bold px-4 py-1.5 rounded-lg text-sm hover:bg-yellow-300 transition"
              >
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      {!isLoggedIn && (
        <div className="bg-amber-100 border-b border-amber-300 p-2.5 text-center text-xs sm:text-sm font-medium text-amber-900">
          🔒 Preços de atacado protegidos. <strong>Faça login para visualizar a tabela!</strong>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-4xl mx-auto p-4">
        
        {/* HOME / VITRINE */}
        {activeTab === 'home' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800">Destaques do Atacado</h2>
              <div className="flex gap-2 sm:hidden">
                <button onClick={() => setActiveTab('supplier')} className="bg-blue-900 text-white text-xs px-3 py-1.5 rounded-lg font-bold">
                  + Peça
                </button>
                <button onClick={() => setActiveTab('admin')} className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg font-bold">
                  Admin
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-500 font-medium">A carregar produtos do banco de dados...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
                <p className="text-slate-500 text-sm mb-3">Ainda não existem produtos cadastrados.</p>
                <button
                  onClick={() => setActiveTab('supplier')}
                  className="bg-blue-900 text-white font-bold px-4 py-2 rounded-xl text-xs"
                >
                  Cadastrar Primeira Peça
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {products.map((product) => (
                  <div key={product.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="w-full h-32 bg-slate-100 rounded-lg overflow-hidden mb-2">
                        <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                      </div>
                      <h3 className="font-semibold text-sm line-clamp-2 text-slate-800">{product.title}</h3>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100">
                      {isLoggedIn ? (
                        <div>
                          <div className="text-xs text-slate-400 line-through">Varejo: R$ {Number(product.retail_price).toFixed(2)}</div>
                          <div className="text-base font-extrabold text-emerald-600">
                            Atacado: R$ {Number(product.wholesale_price).toFixed(2)}
                          </div>
                          <button
                            onClick={() => addToCart(product)}
                            className="w-full mt-2 bg-blue-900 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-blue-800"
                          >
                            + Adicionar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowLoginModal(true)}
                          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                        >
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Ver Preço Atacado</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CATEGORIAS */}
        {activeTab === 'categories' && (
          <div>
            {!selectedCategory ? (
              <div>
                <h2 className="text-lg font-bold mb-4 text-slate-800">Categorias</h2>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat)}
                      className="bg-white border border-slate-200 p-4 rounded-xl font-bold text-left shadow-sm hover:border-blue-500 flex justify-between items-center"
                    >
                      <span>{cat.name}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <button
                  onClick={() => { setSelectedCategory(null); setSelectedSubcategory(null); }}
                  className="flex items-center gap-1 text-sm font-bold text-blue-900 mb-4"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <h2 className="text-xl font-extrabold mb-4 text-slate-900">{selectedCategory.name}</h2>
                {selectedCategory.subcategories && !selectedSubcategory && (
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {selectedCategory.subcategories.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setSelectedSubcategory(sub)}
                        className="bg-slate-100 border border-slate-300 p-3 rounded-lg font-semibold text-left text-sm hover:bg-slate-200 flex justify-between items-center"
                      >
                        <span>{sub}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {products.filter(p => p.category === selectedCategory.id && (!selectedSubcategory || p.subcategory === selectedSubcategory)).map((product) => (
                    <div key={product.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                      <div className="w-full h-28 bg-slate-100 rounded-lg overflow-hidden mb-2">
                        <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                      </div>
                      <h4 className="font-semibold text-xs line-clamp-1">{product.title}</h4>
                      <div className="mt-2 text-emerald-600 font-extrabold text-sm">
                        {isLoggedIn ? `R$ ${Number(product.wholesale_price).toFixed(2)}` : 'Preço Bloqueado'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CADASTRAR PEÇA (FORNECEDOR) */}
        {activeTab === 'supplier' && (
          <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">+ Cadastrar Peça</h2>
                <p className="text-xs text-slate-500">Envie a foto real e configure o preço no Brás</p>
              </div>
              <button onClick={() => setActiveTab('home')} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Título da Peça</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Vestido Longo Canelado"
                  value={newProduct.title}
                  onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Categoria</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white"
                  >
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Subcategoria</label>
                  <input
                    type="text"
                    placeholder="Ex: Vestidos Longos"
                    value={newProduct.subcategory}
                    onChange={(e) => setNewProduct({ ...newProduct, subcategory: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="35.00"
                    value={newProduct.cost_price}
                    onChange={(e) => setNewProduct({ ...newProduct, cost_price: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Estoque</label>
                  <input
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Foto Real da Peça</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files && setImageFile(e.target.files[0])}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-900"
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-blue-900 hover:bg-blue-950 text-white font-extrabold py-3.5 rounded-xl text-sm mt-4"
              >
                {uploading ? 'A enviar...' : 'PUBLICAR PEÇA'}
              </button>
            </form>
          </div>
        )}

        {/* PAINEL ADMIN */}
        {activeTab === 'admin' && (
          <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">⚙️ Painel Admin</h2>
                <p className="text-xs text-slate-500">Gestão e inteligência de preços</p>
              </div>
              <button onClick={() => setActiveTab('home')} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="text-xs font-bold text-slate-500 uppercase">Desconto Atacado</div>
                <div className="text-2xl font-black text-blue-900">{adminSettings.wholesale_discount_percent}%</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="text-xs font-bold text-slate-500 uppercase">Total de Produtos Ativos</div>
                <div className="text-2xl font-black text-emerald-600">{products.length} Peças</div>
              </div>
            </div>
          </div>
        )}

        {/* CARRINHO */}
        {activeTab === 'cart' && (
          <div>
            <h2 className="text-lg font-bold mb-4 text-slate-800">Carrinho B2B</h2>
            {cart.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm font-medium">Carrinho vazio.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm divide-y divide-slate-100">
                  {cart.map((item, idx) => (
                    <div key={idx} className="py-3 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{item.product.title}</h4>
                        <div className="text-xs text-slate-500">{item.qty}x Tam {item.size}</div>
                      </div>
                      <span className="font-extrabold text-sm text-slate-900">
                        R$ {((isLoggedIn ? item.product.wholesale_price : item.product.retail_price) * item.qty).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="bg-blue-900 text-white rounded-xl p-4 shadow-md flex justify-between items-center">
                  <div>
                    <div className="text-xs text-blue-200 font-bold uppercase">{totalItems} Peças</div>
                    <div className="text-2xl font-black">R$ {totalPrice.toFixed(2)}</div>
                  </div>
                  <button onClick={() => setActiveTab('checkout')} className="bg-yellow-400 text-blue-950 font-extrabold px-5 py-2.5 rounded-xl text-sm">
                    CONTINUAR
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CHECKOUT */}
        {activeTab === 'checkout' && (
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-bold mb-4 text-slate-800">Dados de Recebimento</h2>
            <form onSubmit={(e) => { e.preventDefault(); setActiveTab('success'); }} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Endereço Completo</label>
                <input type="text" required value={checkoutData.address} onChange={(e) => setCheckoutData({ ...checkoutData, address: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo</label>
                <input type="text" required value={checkoutData.name} onChange={(e) => setCheckoutData({ ...checkoutData, name: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CPF / CNPJ</label>
                <input type="text" required value={checkoutData.document} onChange={(e) => setCheckoutData({ ...checkoutData, document: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">WhatsApp</label>
                <input type="text" required value={checkoutData.whatsapp} onChange={(e) => setCheckoutData({ ...checkoutData, whatsapp: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-sm mt-4">
                FINALIZAR PEDIDO
              </button>
            </form>
          </div>
        )}

        {/* SUCESSO */}
        {activeTab === 'success' && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-slate-900 mb-2">Pedido Criado com Sucesso!</h2>
            <button onClick={() => { setCart([]); setActiveTab('home'); }} className="bg-blue-900 text-white font-bold px-6 py-2.5 rounded-xl text-sm">
              Voltar ao Início
            </button>
          </div>
        )}
      </main>

      {/* BARRA FIXA INFERIOR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-around items-center z-40">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 text-xs font-bold ${activeTab === 'home' ? 'text-blue-900' : 'text-slate-400'}`}>
          <span>🏠</span><span>Início</span>
        </button>
        <button onClick={() => setActiveTab('categories')} className={`flex flex-col items-center gap-1 text-xs font-bold ${activeTab === 'categories' ? 'text-blue-900' : 'text-slate-400'}`}>
          <span>📁</span><span>Categorias</span>
        </button>
        <button onClick={() => setActiveTab('supplier')} className={`flex flex-col items-center gap-1 text-xs font-bold ${activeTab === 'supplier' ? 'text-blue-900' : 'text-slate-400'}`}>
          <span>➕</span><span>Cadastrar</span>
        </button>
        <button onClick={() => setActiveTab('cart')} className={`flex flex-col items-center gap-1 text-xs font-bold relative ${activeTab === 'cart' ? 'text-blue-900' : 'text-slate-400'}`}>
          <span>🛒</span><span>Carrinho</span>
          {totalItems > 0 && <span className="absolute -top-1 -right-2 bg-yellow-400 text-blue-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">{totalItems}</span>}
        </button>
      </nav>

      {/* MODAL DE LOGIN */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-slate-400 font-bold">✕</button>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-100 text-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Acessar Brás da Net</h3>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Usuário</label>
                <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Senha</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold py-3 rounded-xl text-sm mt-2">
                ENTRAR
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}