<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { itemService } from '@/services/itemService'
import { itemCategoryService } from '@/services/itemCategoryService'
import { itemTransactionService } from '@/services/itemTransactionService'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/utils/dateFormat'

// ============ AUTH / PERMISSIONS ============
// Permission matrix per API doc:
//   - Item, Item-Category list / get  : Admin, Receptionist, Resident
//   - Item, Item-Category create/update/delete + Item transactions : Admin only
//   - /item-transaction (global histori): Admin only → seluruh tab di-hide
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.hasRole('admin'))
const canWriteItem = isAdmin
const canWriteCategory = isAdmin
const canViewTransactions = isAdmin

// ============ TOAST ============
const toast = ref({ show: false, type: 'success', message: '' })
let toastTimer = null
function showToast(message, type = 'success') {
  toast.value = { show: true, type, message }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value.show = false), 2500)
}
function extractError(err, fallback = 'Terjadi kesalahan') {
  return err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback
}

// ============ TABS ============
const activeTab = ref('items') // items | categories | transactions

// ============ ITEMS ============
const items = ref([])
const itemMeta = ref(null)
const itemPage = ref(1)
const itemLimit = ref(10)
const itemSearch = ref('')
const itemSortBy = ref('createdAt')
const itemSortOrder = ref('desc')
const itemCategoryFilter = ref('')
const loadingItems = ref(false)

async function fetchItems() {
  loadingItems.value = true
  try {
    const { data, meta } = await itemService.list({
      page: itemPage.value,
      limit: itemLimit.value,
      search: itemSearch.value || undefined,
      sortBy: itemSortBy.value,
      sortOrder: itemSortOrder.value,
      categoryId: itemCategoryFilter.value || undefined
    })
    items.value = Array.isArray(data) ? data : []
    itemMeta.value = meta
  } catch (err) {
    showToast(extractError(err, 'Gagal memuat item'), 'error')
  } finally {
    loadingItems.value = false
  }
}
const itemTotalPages = computed(() => {
  if (!itemMeta.value) return 1
  return (
    itemMeta.value.totalPages ||
    itemMeta.value.total_pages ||
    Math.max(1, Math.ceil((itemMeta.value.total || 0) / itemLimit.value))
  )
})
watch(itemPage, fetchItems)
watch([itemSortBy, itemSortOrder, itemCategoryFilter], () => {
  itemPage.value = 1
  fetchItems()
})
let itemSearchTimer = null
watch(itemSearch, () => {
  if (itemSearchTimer) clearTimeout(itemSearchTimer)
  itemSearchTimer = setTimeout(() => {
    itemPage.value = 1
    fetchItems()
  }, 400)
})

// ============ ITEM FORM MODAL ============
const showItemModal = ref(false)
const editingItem = ref(null)
const itemForm = ref({ name: '', description: '', qty: 0, note: '', categoryId: '' })
const itemFormError = ref('')
const savingItem = ref(false)

function openCreateItem() {
  editingItem.value = null
  itemForm.value = { name: '', description: '', qty: 0, note: '', categoryId: '' }
  itemFormError.value = ''
  showItemModal.value = true
}
function openEditItem(it) {
  editingItem.value = it
  itemForm.value = {
    name: it.name || '',
    description: it.description || '',
    qty: it.qty ?? 0,
    note: it.note || '',
    categoryId: it.categoryId || it.category?.id || ''
  }
  itemFormError.value = ''
  showItemModal.value = true
}
async function saveItem() {
  itemFormError.value = ''
  if (!itemForm.value.name?.trim()) {
    itemFormError.value = 'Nama wajib diisi'
    return
  }
  if (!itemForm.value.categoryId) {
    itemFormError.value = 'Kategori wajib dipilih'
    return
  }
  savingItem.value = true
  try {
    if (editingItem.value) {
      // PATCH — qty tidak ikut update (qty diatur lewat transaksi)
      await itemService.update(editingItem.value.id, {
        name: itemForm.value.name,
        description: itemForm.value.description || undefined,
        note: itemForm.value.note || undefined,
        categoryId: Number(itemForm.value.categoryId)
      })
      showToast('Item diperbarui')
    } else {
      await itemService.create({
        name: itemForm.value.name,
        description: itemForm.value.description || '',
        qty: Number(itemForm.value.qty) || 0,
        note: itemForm.value.note || undefined,
        categoryId: Number(itemForm.value.categoryId)
      })
      showToast('Item ditambahkan')
    }
    showItemModal.value = false
    await fetchItems()
  } catch (err) {
    itemFormError.value = extractError(err, 'Gagal menyimpan item')
  } finally {
    savingItem.value = false
  }
}
async function removeItem(it) {
  if (!confirm(`Hapus item "${it.name}"?`)) return
  try {
    await itemService.remove(it.id)
    showToast('Item dihapus')
    await fetchItems()
  } catch (err) {
    showToast(extractError(err, 'Gagal menghapus item'), 'error')
  }
}

// ============ TRANSACTION (PER ITEM) ============
const showTxModal = ref(false)
const txTargetItem = ref(null)
const txForm = ref({ type: 'ADD', qty: 1, note: '' })
const txFormError = ref('')
const savingTx = ref(false)
function openTxModal(it) {
  txTargetItem.value = it
  txForm.value = { type: 'ADD', qty: 1, note: '' }
  txFormError.value = ''
  showTxModal.value = true
}
async function saveTx() {
  txFormError.value = ''
  if (!txTargetItem.value) return
  if (txForm.value.qty == null || txForm.value.qty < 0) {
    txFormError.value = 'Qty harus >= 0'
    return
  }
  savingTx.value = true
  try {
    await itemService.createTransaction(txTargetItem.value.id, {
      type: txForm.value.type,
      qty: Number(txForm.value.qty),
      note: txForm.value.note || undefined
    })
    showToast('Transaksi tersimpan')
    showTxModal.value = false
    await Promise.all([fetchItems(), fetchTransactions()])
  } catch (err) {
    txFormError.value = extractError(err, 'Gagal menyimpan transaksi')
  } finally {
    savingTx.value = false
  }
}

// ============ CATEGORIES ============
const categories = ref([])
const categoryMeta = ref(null)
const categoryPage = ref(1)
const categoryLimit = ref(10)
const categorySortBy = ref('createdAt')
const categorySortOrder = ref('desc')
const loadingCategories = ref(false)

async function fetchCategories() {
  loadingCategories.value = true
  try {
    const { data, meta } = await itemCategoryService.list({
      page: categoryPage.value,
      limit: categoryLimit.value,
      sortBy: categorySortBy.value,
      sortOrder: categorySortOrder.value
    })
    categories.value = Array.isArray(data) ? data : []
    categoryMeta.value = meta
  } catch (err) {
    showToast(extractError(err, 'Gagal memuat kategori'), 'error')
  } finally {
    loadingCategories.value = false
  }
}
const categoryTotalPages = computed(() => {
  if (!categoryMeta.value) return 1
  return (
    categoryMeta.value.totalPages ||
    categoryMeta.value.total_pages ||
    Math.max(1, Math.ceil((categoryMeta.value.total || 0) / categoryLimit.value))
  )
})
watch(categoryPage, fetchCategories)
watch([categorySortBy, categorySortOrder], () => {
  categoryPage.value = 1
  fetchCategories()
})

// untuk dropdown
const allCategories = ref([])
async function fetchAllCategoriesForSelect() {
  try {
    const { data } = await itemCategoryService.list({ page: 1, limit: 200 })
    allCategories.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.warn('Gagal load dropdown kategori:', extractError(err))
  }
}
function categoryNameById(id) {
  return allCategories.value.find((c) => String(c.id) === String(id))?.name || '-'
}

// ============ CATEGORY FORM ============
const showCategoryModal = ref(false)
const editingCategory = ref(null)
const categoryForm = ref({ name: '' })
const categoryFormError = ref('')
const savingCategory = ref(false)
function openCreateCategory() {
  editingCategory.value = null
  categoryForm.value = { name: '' }
  categoryFormError.value = ''
  showCategoryModal.value = true
}
function openEditCategory(c) {
  editingCategory.value = c
  categoryForm.value = { name: c.name || '' }
  categoryFormError.value = ''
  showCategoryModal.value = true
}
async function saveCategory() {
  categoryFormError.value = ''
  if (!categoryForm.value.name?.trim()) {
    categoryFormError.value = 'Nama wajib diisi'
    return
  }
  savingCategory.value = true
  try {
    if (editingCategory.value) {
      await itemCategoryService.update(editingCategory.value.id, { name: categoryForm.value.name })
      showToast('Kategori diperbarui')
    } else {
      await itemCategoryService.create({ name: categoryForm.value.name })
      showToast('Kategori ditambahkan')
    }
    showCategoryModal.value = false
    await Promise.all([fetchCategories(), fetchAllCategoriesForSelect()])
  } catch (err) {
    categoryFormError.value = extractError(err, 'Gagal menyimpan kategori')
  } finally {
    savingCategory.value = false
  }
}
async function removeCategory(c) {
  if (!confirm(`Hapus kategori "${c.name}"?`)) return
  try {
    await itemCategoryService.remove(c.id)
    showToast('Kategori dihapus')
    await Promise.all([fetchCategories(), fetchAllCategoriesForSelect()])
  } catch (err) {
    showToast(extractError(err, 'Gagal menghapus kategori'), 'error')
  }
}

// ============ TRANSACTIONS (GLOBAL) ============
const txs = ref([])
const txMeta = ref(null)
const txPage = ref(1)
const txLimit = ref(10)
const txFrom = ref('')
const txTo = ref('')
const txType = ref('')
const txItemId = ref('')
const txSortOrder = ref('desc')
const loadingTxs = ref(false)

async function fetchTransactions() {
  loadingTxs.value = true
  try {
    const { data, meta } = await itemTransactionService.list({
      page: txPage.value,
      limit: txLimit.value,
      from: txFrom.value || undefined,
      to: txTo.value || undefined,
      type: txType.value || undefined,
      itemId: txItemId.value || undefined,
      sortOrder: txSortOrder.value
    })
    txs.value = Array.isArray(data) ? data : []
    txMeta.value = meta
  } catch (err) {
    showToast(extractError(err, 'Gagal memuat transaksi'), 'error')
  } finally {
    loadingTxs.value = false
  }
}
const txTotalPages = computed(() => {
  if (!txMeta.value) return 1
  return (
    txMeta.value.totalPages ||
    txMeta.value.total_pages ||
    Math.max(1, Math.ceil((txMeta.value.total || 0) / txLimit.value))
  )
})
watch(txPage, fetchTransactions)
watch([txType, txItemId, txSortOrder], () => {
  txPage.value = 1
  fetchTransactions()
})
function applyTxDateFilter() {
  txPage.value = 1
  fetchTransactions()
}

// dropdown item buat filter transaksi
const allItems = ref([])
async function fetchAllItemsForSelect() {
  try {
    const { data } = await itemService.list({ page: 1, limit: 500 })
    allItems.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.warn('Gagal load dropdown item:', extractError(err))
  }
}
function itemNameById(id) {
  return allItems.value.find((i) => String(i.id) === String(id))?.name || `#${id}`
}

function txTypeBadge(t) {
  switch ((t || '').toUpperCase()) {
    case 'ADD':
      return 'bg-green-100 text-green-700'
    case 'MINUS':
      return 'bg-red-100 text-red-700'
    case 'ADJUST':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

// ============ MOUNT ============
onMounted(async () => {
  // Transaksi global hanya admin → skip fetch & dropdown item kalau bukan admin
  // (dropdown item dipakai di filter transaksi yang juga admin-only).
  const tasks = [
    fetchItems(),
    fetchCategories(),
    fetchAllCategoriesForSelect()
  ]
  if (canViewTransactions.value) {
    tasks.push(fetchAllItemsForSelect(), fetchTransactions())
  }
  await Promise.all(tasks)
})
</script>

<template>
  <div>
    <transition name="fade-up">
      <div
        v-if="toast.show"
        class="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm"
        :class="toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'"
      >
        {{ toast.message }}
      </div>
    </transition>

    <div class="flex items-center justify-between mb-3 flex-wrap gap-3 fade-up">
      <h1 class="text-xl font-bold text-gray-800">Inventaris 📦</h1>
      <button
        v-if="activeTab === 'items' && canWriteItem"
        @click="openCreateItem"
        class="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
      >
        + Tambah Item
      </button>
      <button
        v-else-if="activeTab === 'categories' && canWriteCategory"
        @click="openCreateCategory"
        class="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
      >
        + Tambah Kategori
      </button>
    </div>

    <div class="border-b border-gray-200 mb-3 fade-up" style="animation-delay: 80ms">
      <nav class="flex gap-6 overflow-x-auto">
        <button
          @click="activeTab = 'items'"
          class="py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
          :class="activeTab === 'items' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'"
        >Item</button>
        <button
          @click="activeTab = 'categories'"
          class="py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
          :class="activeTab === 'categories' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'"
        >Kategori</button>
        <button
          v-if="canViewTransactions"
          @click="activeTab = 'transactions'"
          class="py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
          :class="activeTab === 'transactions' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'"
        >Transaksi</button>
      </nav>
    </div>

    <!-- ============ TAB: ITEMS ============ -->
    <div v-if="activeTab === 'items'" class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden fade-up" style="animation-delay: 150ms">
      <div class="px-3 py-2 border-b border-gray-200 grid grid-cols-2 gap-2 items-center sm:flex sm:flex-wrap">
        <input v-model="itemSearch" type="text" placeholder="Cari nama item..." class="col-span-2 sm:col-auto sm:flex-1 sm:min-w-[180px] w-full min-w-0 px-3 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" />
        <select v-model="itemCategoryFilter" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary">
          <option value="">Semua kategori</option>
          <option v-for="c in allCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model="itemSortBy" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary">
          <option value="createdAt">Urut: Dibuat</option>
          <option value="name">Urut: Nama</option>
        </select>
        <select v-model="itemSortOrder" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary">
          <option value="desc">Terbaru</option>
          <option value="asc">Terlama</option>
        </select>
      </div>

      <!-- DESKTOP table -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Nama</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Kategori</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Qty</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Deskripsi</th>
              <th v-if="canWriteItem" class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="loadingItems"><td :colspan="canWriteItem ? 5 : 4" class="px-3 py-4 text-center text-gray-400 text-sm">Memuat...</td></tr>
            <tr v-else-if="!items.length"><td :colspan="canWriteItem ? 5 : 4" class="px-3 py-4 text-center text-gray-400 text-sm">Belum ada item.</td></tr>
            <tr v-else v-for="it in items" :key="it.id" class="hover:bg-gray-50">
              <td class="px-3 py-1.5 text-sm text-gray-800 font-medium whitespace-nowrap">{{ it.name }}</td>
              <td class="px-3 py-1.5 text-sm text-gray-500 whitespace-nowrap">{{ it.category?.name || categoryNameById(it.categoryId) }}</td>
              <td class="px-3 py-1.5 text-sm text-gray-700 font-mono whitespace-nowrap">{{ it.qty ?? 0 }}</td>
              <td class="px-3 py-1.5 text-sm text-gray-500 max-w-xs truncate" :title="it.description || ''">{{ it.description || '-' }}</td>
              <td v-if="canWriteItem" class="px-3 py-1.5">
                <div class="flex flex-wrap gap-1">
                  <button @click="openTxModal(it)" class="action-btn action-btn-tx" title="Catat transaksi">📊</button>
                  <button @click="openEditItem(it)" class="action-btn action-btn-edit" title="Ubah">✏️</button>
                  <button @click="removeItem(it)" class="action-btn action-btn-delete" title="Hapus">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- MOBILE card list -->
      <div class="md:hidden">
        <div v-if="loadingItems" class="px-3 py-6 text-center text-gray-400 text-sm">Memuat...</div>
        <div v-else-if="!items.length" class="px-3 py-6 text-center text-gray-400 text-sm">Belum ada item.</div>
        <ul v-else class="divide-y divide-gray-200">
          <li v-for="it in items" :key="it.id" class="px-3 py-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="text-sm font-semibold text-gray-800 truncate">{{ it.name }}</div>
                <div class="mt-0.5 flex items-center gap-2 flex-wrap">
                  <span class="text-xs px-2 py-0.5 rounded-full bg-green-50 text-primary">{{ it.category?.name || categoryNameById(it.categoryId) }}</span>
                  <span class="text-xs text-gray-500">Qty: <strong class="font-mono text-gray-700">{{ it.qty ?? 0 }}</strong></span>
                </div>
                <div v-if="it.description" class="mt-1 text-xs text-gray-500 line-clamp-2">{{ it.description }}</div>
              </div>
            </div>
            <div v-if="canWriteItem" class="mt-2 flex flex-wrap gap-1">
              <button @click="openTxModal(it)" class="action-btn action-btn-tx" title="Catat transaksi">📊 Tx</button>
              <button @click="openEditItem(it)" class="action-btn action-btn-edit" title="Ubah">✏️ Ubah</button>
              <button @click="removeItem(it)" class="action-btn action-btn-delete" title="Hapus">🗑️ Hapus</button>
            </div>
          </li>
        </ul>
      </div>

      <div v-if="!loadingItems && items.length" class="flex items-center justify-between px-3 py-2 border-t border-gray-200 text-xs text-gray-500">
        <div>Halaman {{ itemPage }} dari {{ itemTotalPages }}</div>
        <div class="flex gap-2">
          <button :disabled="itemPage <= 1" @click="itemPage--" class="px-2 py-0.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">‹ Prev</button>
          <button :disabled="itemPage >= itemTotalPages" @click="itemPage++" class="px-2 py-0.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next ›</button>
        </div>
      </div>
    </div>

    <!-- ============ TAB: CATEGORIES ============ -->
    <div v-else-if="activeTab === 'categories'" class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden fade-up" style="animation-delay: 150ms">
      <div class="px-3 py-2 border-b border-gray-200 flex flex-wrap gap-2 items-center">
        <select v-model="categorySortBy" class="px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary">
          <option value="createdAt">Urut: Dibuat</option>
          <option value="name">Urut: Nama</option>
        </select>
        <select v-model="categorySortOrder" class="px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary">
          <option value="desc">Terbaru</option>
          <option value="asc">Terlama</option>
        </select>
      </div>
      <!-- DESKTOP table -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Nama</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Dibuat</th>
              <th v-if="canWriteCategory" class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="loadingCategories"><td :colspan="canWriteCategory ? 3 : 2" class="px-3 py-4 text-center text-gray-400 text-sm">Memuat...</td></tr>
            <tr v-else-if="!categories.length"><td :colspan="canWriteCategory ? 3 : 2" class="px-3 py-4 text-center text-gray-400 text-sm">Belum ada kategori.</td></tr>
            <tr v-else v-for="c in categories" :key="c.id" class="hover:bg-gray-50">
              <td class="px-3 py-1.5 text-sm text-gray-800 font-medium whitespace-nowrap">{{ c.name }}</td>
              <td class="px-3 py-1.5 text-sm text-gray-500 whitespace-nowrap">{{ formatDate(c.createdAt) }}</td>
              <td v-if="canWriteCategory" class="px-3 py-1.5">
                <div class="flex flex-wrap gap-1">
                  <button @click="openEditCategory(c)" class="action-btn action-btn-edit" title="Ubah">✏️</button>
                  <button @click="removeCategory(c)" class="action-btn action-btn-delete" title="Hapus">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- MOBILE card list -->
      <div class="md:hidden">
        <div v-if="loadingCategories" class="px-3 py-6 text-center text-gray-400 text-sm">Memuat...</div>
        <div v-else-if="!categories.length" class="px-3 py-6 text-center text-gray-400 text-sm">Belum ada kategori.</div>
        <ul v-else class="divide-y divide-gray-200">
          <li v-for="c in categories" :key="c.id" class="px-3 py-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="text-sm font-semibold text-gray-800 truncate">{{ c.name }}</div>
                <div class="mt-0.5 text-xs text-gray-500">Dibuat {{ formatDate(c.createdAt) }}</div>
              </div>
            </div>
            <div v-if="canWriteCategory" class="mt-2 flex flex-wrap gap-1">
              <button @click="openEditCategory(c)" class="action-btn action-btn-edit" title="Ubah">✏️ Ubah</button>
              <button @click="removeCategory(c)" class="action-btn action-btn-delete" title="Hapus">🗑️ Hapus</button>
            </div>
          </li>
        </ul>
      </div>
      <div v-if="!loadingCategories && categories.length" class="flex items-center justify-between px-3 py-2 border-t border-gray-200 text-xs text-gray-500">
        <div>Halaman {{ categoryPage }} dari {{ categoryTotalPages }}</div>
        <div class="flex gap-2">
          <button :disabled="categoryPage <= 1" @click="categoryPage--" class="px-2 py-0.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">‹ Prev</button>
          <button :disabled="categoryPage >= categoryTotalPages" @click="categoryPage++" class="px-2 py-0.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next ›</button>
        </div>
      </div>
    </div>

    <!-- ============ TAB: TRANSACTIONS (admin only) ============ -->
    <div v-else-if="activeTab === 'transactions' && canViewTransactions" class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden fade-up" style="animation-delay: 150ms">
      <div class="px-3 py-2 border-b border-gray-200 grid grid-cols-2 gap-2 items-center sm:flex sm:flex-wrap">
        <select v-model="txType" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary">
          <option value="">Semua tipe</option>
          <option value="ADD">ADD</option>
          <option value="MINUS">MINUS</option>
          <option value="ADJUST">ADJUST</option>
        </select>
        <select v-model="txItemId" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary">
          <option value="">Semua item</option>
          <option v-for="i in allItems" :key="i.id" :value="i.id">{{ i.name }}</option>
        </select>
        <input v-model="txFrom" type="date" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" />
        <input v-model="txTo" type="date" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" />
        <select v-model="txSortOrder" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary">
          <option value="desc">Terbaru</option>
          <option value="asc">Terlama</option>
        </select>
        <button @click="applyTxDateFilter" class="col-span-2 sm:col-auto w-full sm:w-auto px-3 py-1 bg-primary text-white text-xs rounded-lg hover:bg-green-700">Filter</button>
      </div>
      <!-- DESKTOP table -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Tanggal</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Item</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Tipe</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Qty</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Catatan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="loadingTxs"><td colspan="5" class="px-3 py-4 text-center text-gray-400 text-sm">Memuat...</td></tr>
            <tr v-else-if="!txs.length"><td colspan="5" class="px-3 py-4 text-center text-gray-400 text-sm">Belum ada transaksi.</td></tr>
            <tr v-else v-for="t in txs" :key="t.id" class="hover:bg-gray-50">
              <td class="px-3 py-1.5 text-sm text-gray-500 whitespace-nowrap">{{ formatDate(t.createdAt || t.date) }}</td>
              <td class="px-3 py-1.5 text-sm text-gray-800 font-medium whitespace-nowrap">{{ t.item?.name || itemNameById(t.itemId) }}</td>
              <td class="px-3 py-1.5 whitespace-nowrap">
                <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="txTypeBadge(t.type)">{{ t.type }}</span>
              </td>
              <td class="px-3 py-1.5 text-sm text-gray-700 font-mono whitespace-nowrap">{{ t.changeQty }}</td>
              <td class="px-3 py-1.5 text-sm text-gray-500 max-w-xs truncate" :title="t.note || ''">{{ t.note || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- MOBILE card list -->
      <div class="md:hidden">
        <div v-if="loadingTxs" class="px-3 py-6 text-center text-gray-400 text-sm">Memuat...</div>
        <div v-else-if="!txs.length" class="px-3 py-6 text-center text-gray-400 text-sm">Belum ada transaksi.</div>
        <ul v-else class="divide-y divide-gray-200">
          <li v-for="t in txs" :key="t.id" class="px-3 py-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="text-sm font-semibold text-gray-800 truncate">{{ t.item?.name || itemNameById(t.itemId) }}</div>
                <div class="mt-0.5 text-xs text-gray-500">{{ formatDate(t.createdAt || t.date) }}</div>
              </div>
              <span class="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap" :class="txTypeBadge(t.type)">{{ t.type }}</span>
            </div>
            <div class="mt-1 text-xs text-gray-600">Qty: <strong class="font-mono text-gray-800">{{ t.qty }}</strong></div>
            <div v-if="t.note" class="mt-1 text-xs text-gray-500 line-clamp-2">{{ t.note }}</div>
          </li>
        </ul>
      </div>
      <div v-if="!loadingTxs && txs.length" class="flex items-center justify-between px-3 py-2 border-t border-gray-200 text-xs text-gray-500">
        <div>Halaman {{ txPage }} dari {{ txTotalPages }}</div>
        <div class="flex gap-2">
          <button :disabled="txPage <= 1" @click="txPage--" class="px-2 py-0.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">‹ Prev</button>
          <button :disabled="txPage >= txTotalPages" @click="txPage++" class="px-2 py-0.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next ›</button>
        </div>
      </div>
    </div>

    <!-- ============ ITEM MODAL ============ -->
    <div v-if="showItemModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" @click.self="showItemModal = false">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold text-gray-800 mb-4">{{ editingItem ? 'Ubah Item' : 'Tambah Item' }}</h3>
        <form @submit.prevent="saveItem" class="space-y-4">
          <div v-if="itemFormError" class="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{{ itemFormError }}</div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input v-model="itemForm.name" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select v-model="itemForm.categoryId" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
              <option value="" disabled>Pilih kategori</option>
              <option v-for="c in allCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <textarea v-model="itemForm.description" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"></textarea>
          </div>
          <div v-if="!editingItem">
            <label class="block text-sm font-medium text-gray-700 mb-1">Qty Awal</label>
            <input v-model.number="itemForm.qty" type="number" min="0" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
            <p class="text-xs text-gray-400 mt-1">Setelah dibuat, qty diubah lewat transaksi (tombol 📊).</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea v-model="itemForm.note" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"></textarea>
          </div>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="showItemModal = false" class="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Batal</button>
            <button type="submit" :disabled="savingItem" class="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">{{ savingItem ? 'Menyimpan...' : 'Simpan' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============ CATEGORY MODAL ============ -->
    <div v-if="showCategoryModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" @click.self="showCategoryModal = false">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">{{ editingCategory ? 'Ubah Kategori' : 'Tambah Kategori' }}</h3>
        <form @submit.prevent="saveCategory" class="space-y-4">
          <div v-if="categoryFormError" class="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{{ categoryFormError }}</div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input v-model="categoryForm.name" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="showCategoryModal = false" class="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Batal</button>
            <button type="submit" :disabled="savingCategory" class="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">{{ savingCategory ? 'Menyimpan...' : 'Simpan' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============ TRANSACTION MODAL ============ -->
    <div v-if="showTxModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" @click.self="showTxModal = false">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-1">Catat Transaksi</h3>
        <p class="text-sm text-gray-500 mb-4">Item: <strong>{{ txTargetItem?.name }}</strong> · Qty saat ini: <strong>{{ txTargetItem?.qty ?? 0 }}</strong></p>
        <form @submit.prevent="saveTx" class="space-y-4">
          <div v-if="txFormError" class="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{{ txFormError }}</div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
            <select v-model="txForm.type" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
              <option value="ADD">ADD (tambah stok)</option>
              <option value="MINUS">MINUS (kurangi stok)</option>
              <option value="ADJUST">ADJUST (set ke nilai)</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Qty</label>
            <input v-model.number="txForm.qty" type="number" min="0" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea v-model="txForm.note" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"></textarea>
          </div>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="showTxModal = false" class="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Batal</button>
            <button type="submit" :disabled="savingTx" class="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">{{ savingTx ? 'Menyimpan...' : 'Simpan' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-up { opacity: 0; transform: translateY(16px); animation: fadeUp 0.5s ease forwards; }
@keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
.fade-up-enter-active, .fade-up-leave-active { transition: all 0.25s ease; }
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translateY(-6px); }

.action-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 8px;
  font-size: 0.72rem; font-weight: 600;
  border: 1px solid transparent; cursor: pointer;
  transition: transform 0.15s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}
.action-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
.action-btn-edit { background: #e8f5e9; color: #2E7D32; border-color: #c8e6c9; }
.action-btn-edit:hover { background: #c8e6c9; }
.action-btn-tx { background: #eef2ff; color: #4338ca; border-color: #e0e7ff; }
.action-btn-tx:hover { background: #e0e7ff; }
.action-btn-delete { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
.action-btn-delete:hover { background: #fca5a5; color: white; }
</style>
