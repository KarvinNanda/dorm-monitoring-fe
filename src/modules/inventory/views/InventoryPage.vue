<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ArrowUpDown, Pencil, Plus, SlidersHorizontal, StickyNote, Tag, Trash2 } from 'lucide-vue-next'
import AppToast from '@/components/AppToast.vue'
import BaseModal from '@/components/BaseModal.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import { confirmDialog } from '@/composables/useConfirm'
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
// Mobile: filter transaksi disembunyikan di balik tombol supaya daftar langsung terlihat.
const showTxFilters = ref(false)

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
  const ok = await confirmDialog({ title: 'Hapus item?', message: `Item "${it.name}" akan dihapus.` })
  if (!ok) return
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
  if (txForm.value.qty == null || txForm.value.qty === '' || txForm.value.qty < 0) {
    txFormError.value = 'Jumlah tidak boleh kosong atau negatif'
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
function resolvedCategoryName(it) {
  return it.category?.name || categoryNameById(it.categoryId)
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
  const ok = await confirmDialog({ title: 'Hapus kategori?', message: `Kategori "${c.name}" akan dihapus.` })
  if (!ok) return
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

// Nilai enum dari API tetap dikirim apa adanya; yang diterjemahkan hanya label.
const TX_TYPES = [
  { value: 'ADD', label: 'Tambah', cls: 'chip-brand', hint: 'Jumlah yang ditambahkan ke stok.' },
  { value: 'MINUS', label: 'Kurangi', cls: 'chip-red', hint: 'Jumlah yang dikurangi dari stok.' },
  { value: 'ADJUST', label: 'Penyesuaian', cls: 'chip-amber', hint: 'Stok diubah menjadi jumlah ini (mis. setelah hitung ulang).' }
]

function txTypeInfo(t) {
  return TX_TYPES.find((x) => x.value === (t || '').toUpperCase()) || { label: t || '-', cls: 'chip-gray' }
}

// changeQty dari backend: selisih stok. Tanda +/− supaya arah perubahan jelas.
function txChangeLabel(t) {
  const n = Number(t.changeQty ?? 0)
  const type = (t.type || '').toUpperCase()
  if (type === 'MINUS') return `−${Math.abs(n)}`
  if (type === 'ADD') return `+${Math.abs(n)}`
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0'
}

const txHint = computed(() => txTypeInfo(txForm.value.type).hint)

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
  <div class="space-y-4">
    <AppToast :toast="toast" />

    <!-- Toolbar: tab + aksi utama. Judul halaman sudah ada di header layout. -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div
        class="tabs grid w-full sm:w-auto sm:inline-flex"
        :class="canViewTransactions ? 'grid-cols-3' : 'grid-cols-2'"
        role="tablist"
        aria-label="Bagian halaman inventaris"
      >
        <button type="button" role="tab" class="tab" :aria-selected="activeTab === 'items'" @click="activeTab = 'items'">Item</button>
        <button type="button" role="tab" class="tab" :aria-selected="activeTab === 'categories'" @click="activeTab = 'categories'">Kategori</button>
        <button
          v-if="canViewTransactions"
          type="button"
          role="tab"
          class="tab"
          :aria-selected="activeTab === 'transactions'"
          @click="activeTab = 'transactions'"
        >Transaksi</button>
      </div>
      <button v-if="activeTab === 'items' && canWriteItem" type="button" class="btn btn-primary" @click="openCreateItem">
        <Plus class="w-4 h-4" aria-hidden="true" />
        Tambah Item
      </button>
      <button v-else-if="activeTab === 'categories' && canWriteCategory" type="button" class="btn btn-primary" @click="openCreateCategory">
        <Plus class="w-4 h-4" aria-hidden="true" />
        Tambah Kategori
      </button>
    </div>

    <!-- ============ TAB: ITEM ============ -->
    <section v-if="activeTab === 'items'" class="card overflow-hidden" aria-label="Daftar item">
      <div class="p-4 border-b border-gray-200 grid grid-cols-2 gap-3 lg:grid-cols-[1fr_repeat(3,minmax(0,12rem))] items-end">
        <div class="col-span-2 lg:col-span-1">
          <label for="item-search" class="field-label text-xs">Cari</label>
          <input id="item-search" v-model="itemSearch" type="search" placeholder="Nama item" class="field" />
        </div>
        <div class="col-span-2 sm:col-span-1">
          <label for="item-category" class="field-label text-xs">Kategori</label>
          <select id="item-category" v-model="itemCategoryFilter" class="field">
            <option value="">Semua kategori</option>
            <option v-for="c in allCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label for="item-sort" class="field-label text-xs">Urutkan</label>
          <select id="item-sort" v-model="itemSortBy" class="field">
            <option value="createdAt">Dibuat</option>
            <option value="name">Nama</option>
          </select>
        </div>
        <div>
          <label for="item-order" class="field-label text-xs">Arah</label>
          <select id="item-order" v-model="itemSortOrder" class="field">
            <option value="desc">Terbaru</option>
            <option value="asc">Terlama</option>
          </select>
        </div>
      </div>

      <div v-if="loadingItems" class="empty-state" aria-busy="true">Memuat...</div>
      <div v-else-if="!items.length" class="empty-state">Belum ada item.</div>
      <template v-else>
        <!-- DESKTOP table -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs text-ink-muted">
              <tr>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Nama</th>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Kategori</th>
                <th scope="col" class="text-right font-medium px-4 py-2.5">Stok</th>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Deskripsi</th>
                <th v-if="canWriteItem" scope="col" class="text-right font-medium px-4 py-2.5"><span class="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="it in items" :key="it.id" class="hover:bg-gray-50">
                <td class="px-4 py-2 font-medium text-ink whitespace-nowrap">{{ it.name }}</td>
                <td class="px-4 py-2"><span class="chip chip-gray">{{ resolvedCategoryName(it) }}</span></td>
                <td class="px-4 py-2 text-right text-ink font-semibold tabular-nums">{{ it.qty ?? 0 }}</td>
                <td class="px-4 py-2 text-ink-muted max-w-xs truncate" :title="it.description || ''">{{ it.description || '-' }}</td>
                <td v-if="canWriteItem" class="px-4 py-2">
                  <div class="flex justify-end gap-1">
                    <button
                      type="button"
                      class="icon-btn"
                      title="Catat transaksi"
                      :aria-label="`Catat transaksi ${it.name}`"
                      @click="openTxModal(it)"
                    ><ArrowUpDown class="w-4 h-4" aria-hidden="true" /></button>
                    <button
                      type="button"
                      class="icon-btn"
                      title="Ubah"
                      :aria-label="`Ubah item ${it.name}`"
                      @click="openEditItem(it)"
                    ><Pencil class="w-4 h-4" aria-hidden="true" /></button>
                    <button
                      type="button"
                      class="icon-btn icon-btn-danger"
                      title="Hapus"
                      :aria-label="`Hapus item ${it.name}`"
                      @click="removeItem(it)"
                    ><Trash2 class="w-4 h-4" aria-hidden="true" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- MOBILE list -->
        <ul class="md:hidden divide-y divide-gray-200">
          <li v-for="it in items" :key="it.id" class="p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-semibold text-ink truncate">{{ it.name }}</p>
                <p class="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted truncate">
                  <Tag class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  {{ resolvedCategoryName(it) }}
                </p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-xs text-ink-muted">Stok</p>
                <p class="text-lg font-semibold text-ink tabular-nums leading-tight">{{ it.qty ?? 0 }}</p>
              </div>
            </div>
            <p v-if="it.description" class="mt-2 text-sm text-ink-muted line-clamp-2">{{ it.description }}</p>
            <div v-if="canWriteItem" class="mt-3 flex items-center gap-2">
              <button type="button" class="btn btn-secondary flex-1" @click="openTxModal(it)">
                <ArrowUpDown class="w-4 h-4" aria-hidden="true" />
                Catat transaksi
              </button>
              <div class="flex gap-1 ml-auto">
                <button
                  type="button"
                  class="icon-btn w-11 h-11"
                  :aria-label="`Ubah item ${it.name}`"
                  @click="openEditItem(it)"
                ><Pencil class="w-4 h-4" aria-hidden="true" /></button>
                <button
                  type="button"
                  class="icon-btn icon-btn-danger w-11 h-11"
                  :aria-label="`Hapus item ${it.name}`"
                  @click="removeItem(it)"
                ><Trash2 class="w-4 h-4" aria-hidden="true" /></button>
              </div>
            </div>
          </li>
        </ul>

        <PaginationBar v-model:page="itemPage" :total-pages="itemTotalPages" />
      </template>
    </section>

    <!-- ============ TAB: KATEGORI ============ -->
    <section v-else-if="activeTab === 'categories'" class="card overflow-hidden" aria-label="Daftar kategori">
      <div class="p-4 border-b border-gray-200 grid grid-cols-2 gap-3 sm:max-w-md items-end">
        <div>
          <label for="category-sort" class="field-label text-xs">Urutkan</label>
          <select id="category-sort" v-model="categorySortBy" class="field">
            <option value="createdAt">Dibuat</option>
            <option value="name">Nama</option>
          </select>
        </div>
        <div>
          <label for="category-order" class="field-label text-xs">Arah</label>
          <select id="category-order" v-model="categorySortOrder" class="field">
            <option value="desc">Terbaru</option>
            <option value="asc">Terlama</option>
          </select>
        </div>
      </div>

      <div v-if="loadingCategories" class="empty-state" aria-busy="true">Memuat...</div>
      <div v-else-if="!categories.length" class="empty-state">Belum ada kategori.</div>
      <template v-else>
        <ul class="divide-y divide-gray-200">
          <li v-for="c in categories" :key="c.id" class="flex items-center gap-3 px-4 py-3">
            <div class="min-w-0 flex-1">
              <p class="font-medium text-ink truncate">{{ c.name }}</p>
              <p class="text-xs text-ink-muted tabular-nums">Dibuat {{ formatDate(c.createdAt) }}</p>
            </div>
            <div v-if="canWriteCategory" class="flex gap-1 -mr-2">
              <button
                type="button"
                class="icon-btn w-11 h-11 md:w-9 md:h-9"
                title="Ubah"
                :aria-label="`Ubah kategori ${c.name}`"
                @click="openEditCategory(c)"
              ><Pencil class="w-4 h-4" aria-hidden="true" /></button>
              <button
                type="button"
                class="icon-btn icon-btn-danger w-11 h-11 md:w-9 md:h-9"
                title="Hapus"
                :aria-label="`Hapus kategori ${c.name}`"
                @click="removeCategory(c)"
              ><Trash2 class="w-4 h-4" aria-hidden="true" /></button>
            </div>
          </li>
        </ul>

        <PaginationBar v-model:page="categoryPage" :total-pages="categoryTotalPages" />
      </template>
    </section>

    <!-- ============ TAB: TRANSAKSI (admin) ============ -->
    <section v-else-if="canViewTransactions" class="card overflow-hidden" aria-label="Riwayat transaksi">
      <div class="p-4 border-b border-gray-200">
        <button
          type="button"
          class="btn btn-secondary w-full md:hidden"
          :aria-expanded="showTxFilters"
          aria-controls="tx-filters"
          @click="showTxFilters = !showTxFilters"
        >
          <SlidersHorizontal class="w-4 h-4" aria-hidden="true" />
          {{ showTxFilters ? 'Sembunyikan filter' : 'Filter & urutan' }}
        </button>
        <div
          id="tx-filters"
          class="gap-3 grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] items-end"
          :class="showTxFilters ? 'grid mt-3 md:mt-0' : 'hidden md:grid'"
        >
          <div>
            <label for="tx-type" class="field-label text-xs">Tipe</label>
            <select id="tx-type" v-model="txType" class="field">
              <option value="">Semua tipe</option>
              <option v-for="t in TX_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>
          <div>
            <label for="tx-item" class="field-label text-xs">Item</label>
            <select id="tx-item" v-model="txItemId" class="field">
              <option value="">Semua item</option>
              <option v-for="i in allItems" :key="i.id" :value="i.id">{{ i.name }}</option>
            </select>
          </div>
          <div>
            <label for="tx-from" class="field-label text-xs">Dari tanggal</label>
            <input id="tx-from" v-model="txFrom" type="date" class="field" />
          </div>
          <div>
            <label for="tx-to" class="field-label text-xs">Sampai tanggal</label>
            <input id="tx-to" v-model="txTo" type="date" class="field" />
          </div>
          <div>
            <label for="tx-order" class="field-label text-xs">Urutan</label>
            <select id="tx-order" v-model="txSortOrder" class="field">
              <option value="desc">Terbaru</option>
              <option value="asc">Terlama</option>
            </select>
          </div>
          <button type="button" class="btn btn-primary col-span-2 lg:col-span-1" @click="applyTxDateFilter">Terapkan</button>
        </div>
      </div>

      <div v-if="loadingTxs" class="empty-state" aria-busy="true">Memuat...</div>
      <div v-else-if="!txs.length" class="empty-state">Belum ada transaksi.</div>
      <template v-else>
        <!-- DESKTOP table -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs text-ink-muted">
              <tr>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Waktu</th>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Item</th>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Tipe</th>
                <th scope="col" class="text-right font-medium px-4 py-2.5">Perubahan</th>
                <th scope="col" class="text-right font-medium px-4 py-2.5">Stok</th>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Catatan</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="t in txs" :key="t.id" class="hover:bg-gray-50">
                <td class="px-4 py-2 text-ink-muted whitespace-nowrap tabular-nums">{{ formatDate(t.createdAt || t.date) }}</td>
                <td class="px-4 py-2 font-medium text-ink whitespace-nowrap">{{ t.item?.name || itemNameById(t.itemId) }}</td>
                <td class="px-4 py-2"><span class="chip" :class="txTypeInfo(t.type).cls">{{ txTypeInfo(t.type).label }}</span></td>
                <td class="px-4 py-2 text-right font-semibold text-ink tabular-nums whitespace-nowrap">{{ txChangeLabel(t) }}</td>
                <td class="px-4 py-2 text-right text-ink-muted tabular-nums whitespace-nowrap">{{ t.beforeQty ?? '-' }} → {{ t.afterQty ?? '-' }}</td>
                <td class="px-4 py-2 text-ink-muted max-w-xs truncate" :title="t.note || ''">{{ t.note || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- MOBILE list -->
        <ul class="md:hidden divide-y divide-gray-200">
          <li v-for="t in txs" :key="t.id" class="p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-semibold text-ink truncate">{{ t.item?.name || itemNameById(t.itemId) }}</p>
                <p class="mt-0.5 text-xs text-ink-muted tabular-nums">{{ formatDate(t.createdAt || t.date) }}</p>
              </div>
              <span class="chip" :class="txTypeInfo(t.type).cls">{{ txTypeInfo(t.type).label }}</span>
            </div>
            <dl class="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt class="text-xs text-ink-muted">Perubahan</dt>
                <dd class="font-semibold text-ink tabular-nums">{{ txChangeLabel(t) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-muted">Stok</dt>
                <dd class="text-ink tabular-nums">{{ t.beforeQty ?? '-' }} → {{ t.afterQty ?? '-' }}</dd>
              </div>
            </dl>
            <p v-if="t.note" class="mt-2 flex items-start gap-1.5 text-sm text-ink-muted">
              <StickyNote class="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span class="line-clamp-2">{{ t.note }}</span>
            </p>
          </li>
        </ul>

        <PaginationBar v-model:page="txPage" :total-pages="txTotalPages" />
      </template>
    </section>

    <!-- ============ ITEM MODAL ============ -->
    <BaseModal v-model:open="showItemModal" :title="editingItem ? 'Ubah Item' : 'Tambah Item'">
      <form id="item-form" class="space-y-4" @submit.prevent="saveItem">
        <p v-if="itemFormError" class="form-error" role="alert">{{ itemFormError }}</p>
        <div>
          <label for="item-form-name" class="field-label">Nama</label>
          <input id="item-form-name" v-model="itemForm.name" type="text" required autocomplete="off" class="field" />
        </div>
        <div>
          <label for="item-form-category" class="field-label">Kategori</label>
          <select id="item-form-category" v-model="itemForm.categoryId" required class="field">
            <option value="" disabled>Pilih kategori</option>
            <option v-for="c in allCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div v-if="!editingItem">
          <label for="item-form-qty" class="field-label">Stok awal</label>
          <input id="item-form-qty" v-model.number="itemForm.qty" type="number" min="0" inputmode="numeric" class="field" />
          <p class="field-hint">Setelah item dibuat, stok diubah lewat "Catat transaksi".</p>
        </div>
        <div>
          <label for="item-form-desc" class="field-label">Deskripsi <span class="font-normal text-ink-muted">(opsional)</span></label>
          <textarea id="item-form-desc" v-model="itemForm.description" rows="2" class="field"></textarea>
        </div>
        <div>
          <label for="item-form-note" class="field-label">Catatan <span class="font-normal text-ink-muted">(opsional)</span></label>
          <textarea id="item-form-note" v-model="itemForm.note" rows="2" class="field"></textarea>
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn btn-secondary flex-1" @click="showItemModal = false">Batal</button>
        <button type="submit" form="item-form" class="btn btn-primary flex-1" :disabled="savingItem">
          {{ savingItem ? 'Menyimpan...' : 'Simpan' }}
        </button>
      </template>
    </BaseModal>

    <!-- ============ TRANSACTION MODAL ============ -->
    <BaseModal v-model:open="showTxModal" title="Catat Transaksi">
      <form id="tx-form" class="space-y-4" @submit.prevent="saveTx">
        <p class="text-sm text-ink-muted">
          Item: <strong class="text-ink">{{ txTargetItem?.name }}</strong>
          · Stok saat ini: <strong class="text-ink tabular-nums">{{ txTargetItem?.qty ?? 0 }}</strong>
        </p>
        <p v-if="txFormError" class="form-error" role="alert">{{ txFormError }}</p>
        <div>
          <label for="tx-form-type" class="field-label">Tipe</label>
          <select id="tx-form-type" v-model="txForm.type" class="field">
            <option v-for="t in TX_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
        <div>
          <label for="tx-form-qty" class="field-label">Jumlah</label>
          <input
            id="tx-form-qty"
            v-model.number="txForm.qty"
            type="number"
            min="0"
            inputmode="numeric"
            required
            aria-describedby="tx-form-qty-hint"
            class="field"
          />
          <p id="tx-form-qty-hint" class="field-hint">{{ txHint }}</p>
        </div>
        <div>
          <label for="tx-form-note" class="field-label">Catatan <span class="font-normal text-ink-muted">(opsional)</span></label>
          <textarea id="tx-form-note" v-model="txForm.note" rows="2" class="field"></textarea>
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn btn-secondary flex-1" @click="showTxModal = false">Batal</button>
        <button type="submit" form="tx-form" class="btn btn-primary flex-1" :disabled="savingTx">
          {{ savingTx ? 'Menyimpan...' : 'Simpan' }}
        </button>
      </template>
    </BaseModal>

    <!-- ============ CATEGORY MODAL ============ -->
    <BaseModal v-model:open="showCategoryModal" :title="editingCategory ? 'Ubah Kategori' : 'Tambah Kategori'">
      <form id="category-form" class="space-y-4" @submit.prevent="saveCategory">
        <p v-if="categoryFormError" class="form-error" role="alert">{{ categoryFormError }}</p>
        <div>
          <label for="category-form-name" class="field-label">Nama</label>
          <input id="category-form-name" v-model="categoryForm.name" type="text" required autocomplete="off" class="field" />
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn btn-secondary flex-1" @click="showCategoryModal = false">Batal</button>
        <button type="submit" form="category-form" class="btn btn-primary flex-1" :disabled="savingCategory">
          {{ savingCategory ? 'Menyimpan...' : 'Simpan' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>
