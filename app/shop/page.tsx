/**
 * Customer Shop Page - Main rental shop after login
 * Shows available products in grid/list view with filtering and search
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart, Star, Filter, Grid3X3, List, Search, Calendar, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { IProduct } from '@/types';

export default function ShopPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  
  const [products, setProducts] = useState<IProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 10000 });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date picker modal state
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<IProduct | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Categories from the wireframe
  const categories = ['Electronics', 'Furniture', 'Vehicles', 'Tools', 'Sports'];

  // Redirect if not customer
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user?.role !== 'customer') {
      router.push('/login');
    }
  }, [session, status, router]);

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products?available=all');
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data);
        setFilteredProducts(data.data);
      } else {
        toast.error('Failed to load products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Same search UX as enduser/products: client-side filtering based on a controlled input

  // Filter products
  useEffect(() => {
    let filtered = [...products];

    // Text search (name, category, description)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((product: any) =>
        (product.name || '').toLowerCase().includes(q) ||
        (product.category || '').toLowerCase().includes(q) ||
        (product.description || '').toLowerCase().includes(q)
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Filter by price range
    filtered = filtered.filter(product => {
      const price = product.pricePerDay || 0;
      return price >= priceRange.min && price <= priceRange.max;
    });

    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory, priceRange]);

  // No separate handler needed; we filter in the effect above like enduser/products

  // Open date picker modal
  const openDatePicker = (product: IProduct) => {
    setSelectedProduct(product);
    // Set default dates
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
    setFromDate(tomorrow);
    setToDate(dayAfter);
    setShowDateModal(true);
  };

  // Add to cart with selected dates
  const addToCartWithDates = async () => {
    if (!selectedProduct || !fromDate || !toDate) {
      toast.error('Please select valid dates');
      return;
    }

    if (new Date(fromDate) >= new Date(toDate)) {
      toast.error('End date must be after start date');
      return;
    }

    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const existingItem = cart.find((item: any) => item.productId === selectedProduct._id?.toString());
      
      if (existingItem) {
        existingItem.quantity += 1;
        existingItem.fromDate = fromDate;
        existingItem.toDate = toDate;
        existingItem.totalPrice = (existingItem.pricePerDay || 0) * existingItem.quantity;
      } else {
        const pricePerDay = selectedProduct.pricePerDay || selectedProduct.pricePerHour || 0;
        cart.push({
          productId: selectedProduct._id?.toString(),
          name: selectedProduct.name,
          image: selectedProduct.image,
          pricePerDay: pricePerDay,
          quantity: 1,
          duration: 'day',
          totalPrice: pricePerDay,
          fromDate: fromDate,
          toDate: toDate,
          endUserId: selectedProduct.endUserId?.toString()
        });
      }
      
      localStorage.setItem('cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cartUpdated'));
      
      setShowDateModal(false);
      setSelectedProduct(null);
      toast.success('Added to cart');
      location.assign('/cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    }
  };

  // Add to wishlist function
  const addToWishlist = async (productId: string) => {
    try {
      // For now, we'll use localStorage for wishlist
      const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
      if (!wishlist.includes(productId)) {
        wishlist.push(productId);
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        toast.success('Added to wishlist');
      } else {
        toast('Already in wishlist');
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast.error('Failed to add to wishlist');
    }
  };

  // Product card component
  const ProductCard = ({ product }: { product: IProduct }) => {
    const defaultImage = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop';
    
    return (
      <div className={`bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-all duration-200 ${
        viewMode === 'list' ? 'flex items-center p-4' : 'overflow-hidden'
      }`}>
        {/* Product Image */}
        <div className={`relative ${
          viewMode === 'list' ? 'w-24 h-24 flex-shrink-0' : 'w-full h-48'
        }`}>
          <Image
            src={product.image || defaultImage}
            alt={product.name}
            fill
            className="object-cover"
          />
          {!product.availability && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-xs px-2 py-1 rounded bg-black/60">Unavailable</span>
            </div>
          )}
          <button
            onClick={() => addToWishlist(product._id!.toString())}
            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
          >
            <Heart className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Product Info */}
        <div className={`${viewMode === 'list' ? 'flex-1 ml-4' : 'p-4'}`}>
          <div className={`${viewMode === 'list' ? 'flex items-center justify-between' : ''}`}>
            <div className={viewMode === 'list' ? 'flex-1' : ''}>
              <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
              <p className="text-primary-800 font-bold text-lg">
                ₹{product.pricePerDay}/day
              </p>
              
              {viewMode === 'grid' && (
                <div className="mt-2">
                  <div className="flex items-center space-x-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {product.description}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className={`${viewMode === 'list' ? 'flex items-center space-x-2' : 'mt-4 flex space-x-2'}`}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!product.availability) { 
                    toast.error('This item is currently unavailable'); 
                    return; 
                  }
                  openDatePicker(product);
                }}
                className="flex-1 bg-primary-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Add to Cart</span>
              </button>
              
              {viewMode === 'list' && (
                <p className="text-primary-800 font-bold text-lg">
                  ₹{product.pricePerDay}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-800"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header with Search and Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Rental Shop</h1>
            <p className="text-gray-600 mt-2">Find the perfect items for your rental needs</p>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 border rounded-full text-sm transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Search and Controls */}
            <div className="flex items-center space-x-4">
              {/* Price Filter */}
              <select 
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'low-high') {
                    // Sort by price low to high
                    const sorted = [...filteredProducts].sort((a, b) => {
                      const priceA = a.pricePerDay || a.pricePerHour || 0;
                      const priceB = b.pricePerDay || b.pricePerHour || 0;
                      return priceA - priceB;
                    });
                    setFilteredProducts(sorted);
                  } else if (value === 'high-low') {
                    // Sort by price high to low
                    const sorted = [...filteredProducts].sort((a, b) => {
                      const priceA = a.pricePerDay || a.pricePerHour || 0;
                      const priceB = b.pricePerDay || b.pricePerHour || 0;
                      return priceB - priceA;
                    });
                    setFilteredProducts(sorted);
                  }
                }}
              >
                <option value="">Price List</option>
                <option value="low-high">Low to High</option>
                <option value="high-low">High to Low</option>
              </select>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>

              {/* Sort */}
              <select 
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                onChange={(e) => {
                  const value = e.target.value;
                  let sorted = [...filteredProducts];
                  if (value === 'name-asc') {
                    sorted.sort((a, b) => a.name.localeCompare(b.name));
                  } else if (value === 'name-desc') {
                    sorted.sort((a, b) => b.name.localeCompare(a.name));
                  }
                  setFilteredProducts(sorted);
                }}
              >
                <option value="">Sort by</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>

              {/* View Toggle */}
              <div className="flex border border-gray-300 rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                  } transition-colors`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                  } transition-colors`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters - Desktop */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Product Attributes</h3>
              
              {/* Categories */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-3">Categories</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`block w-full text-left px-3 py-2 rounded-md text-sm ${
                      selectedCategory === '' 
                        ? 'bg-primary-800 text-white' 
                        : 'text-gray-600 hover:bg-gray-50'
                    } transition-colors`}
                  >
                    All Categories
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`block w-full text-left px-3 py-2 rounded-md text-sm ${
                        selectedCategory === category 
                          ? 'bg-primary-800 text-white' 
                          : 'text-gray-600 hover:bg-gray-50'
                      } transition-colors`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-3">Price Range</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Min Price</label>
                    <input
                      type="number"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Max Price</label>
                    <input
                      type="number"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Filter Button */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="flex items-center space-x-2 bg-primary-800 text-white px-4 py-2 rounded-md"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>
          </div>

          {/* Mobile Filters */}
          {showMobileFilters && (
            <div className="lg:hidden bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Category</h4>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Min Price</label>
                    <input
                      type="number"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Max Price</label>
                    <input
                      type="number"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Products Grid/List */}
          <div className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No products found</p>
              </div>
            ) : (
              <>
                <div className={`${
                  viewMode === 'grid' 
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
                    : 'space-y-4'
                }`}>
                  {filteredProducts.map((product) => (
                    <Link key={product._id!.toString()} href={`/shop/product/${product._id}`}>
                      <ProductCard product={product} />
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex justify-center items-center space-x-2 mt-8">
                  <button className="px-3 py-2 text-gray-600 hover:text-primary-800 transition-colors">
                    &lt;
                  </button>
                  <button className="px-3 py-2 bg-primary-800 text-white rounded-full">
                    1
                  </button>
                  <button className="px-3 py-2 text-gray-600 hover:text-primary-800 transition-colors">
                    2
                  </button>
                  <button className="px-3 py-2 text-gray-600 hover:text-primary-800 transition-colors">
                    3
                  </button>
                  <button className="px-3 py-2 text-gray-600 hover:text-primary-800 transition-colors">
                    4
                  </button>
                  <span className="px-3 py-2 text-gray-600">...</span>
                  <button className="px-3 py-2 text-gray-600 hover:text-primary-800 transition-colors">
                    10
                  </button>
                  <button className="px-3 py-2 text-gray-600 hover:text-primary-800 transition-colors">
                    &gt;
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Date Picker Modal */}
      {showDateModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Select Rental Dates</h3>
              <button
                onClick={() => setShowDateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">{selectedProduct.name}</h4>
                <p className="text-sm text-gray-600">₹{selectedProduct.pricePerDay}/day</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    min={fromDate || new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              
              {fromDate && toDate && new Date(fromDate) < new Date(toDate) && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-600">
                    Duration: {Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24))} days
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    Total: ₹{(selectedProduct.pricePerDay || 0) * Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24))}
                  </p>
                </div>
              )}
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowDateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addToCartWithDates}
                  className="flex-1 px-4 py-2 bg-primary-800 text-white rounded-md hover:bg-primary-700"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
