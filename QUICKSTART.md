# Quick Start Guide - Hierarchical Product Selection

## ✅ What's Been Built

The complete 5-level hierarchical product selection system is now implemented:

1. **Database Schema** - New tables for ColorMaster, ProductVariant, ProductColor, StockVariant
2. **Backend APIs** - Search, validation, and transfer endpoints
3. **React Component** - HierarchicalProductSelector with search, grouping, and stock validation
4. **Demo Page** - Complete working example at `/admin/send-stock-v2`
5. **UI Components** - All required shadcn/ui components

## 🚀 Next Steps to Test

### Step 1: Install Dependencies

```bash
cd textilestock
npm install @tanstack/react-query class-variance-authority @radix-ui/react-select @radix-ui/react-slot lucide-react
```

### Step 2: Run Data Migration

**⚠️ IMPORTANT: Backup your database first!**

```bash
# Migrate existing products to hierarchical system
npx tsx scripts/migrate-to-variants.ts

# Verify migration was successful
npx tsx scripts/migrate-to-variants.ts verify
```

This will:
- Create ColorMaster entries from existing colors
- Generate ProductVariant records for each shade/design
- Create ProductColor junction records with unique SKUs
- Migrate Stock → StockVariant
- Mark products with `hasVariants = true`

### Step 3: Start Development Server

```bash
npm run dev
```

### Step 4: Test the Demo Page

1. Navigate to: **http://localhost:3000/admin/send-stock-v2**

2. **Select "From Location"** (source warehouse)
   - This enables the product search

3. **Search for a product** (type at least 2 characters)
   - Try searching by: category, product name, shade code, color code
   - Example: "baba", "3meter", "NF", "457"

4. **View grouped results**
   - Each card shows: Category > Product (Variant)
   - Colors listed inside each variant card
   - Stock availability badges (In Stock/Low/Very Low/Out of Stock)

5. **Add colors to cart**
   - Click "Add" button on any color
   - It will appear in the "Selected Items" section below

6. **Enter quantities**
   - Type quantity in the input field
   - Real-time validation against available stock
   - See alternate unit calculations (e.g., Pcs → Yards)

7. **Select "To Location"** (destination)

8. **Create Transfer**
   - Click "Create Transfer" button
   - System validates all items
   - Creates transfer with unique transfer number
   - Deducts stock from source location

## 🧪 Testing Checklist

### Database
- [ ] Migration completed without errors
- [ ] No duplicate SKUs (check verify output)
- [ ] Stock totals match between old and new system
- [ ] Products have `hasVariants = true`

### Search Functionality
- [ ] Search works with 2+ characters
- [ ] Results are grouped by Product+Variant
- [ ] Colors display with swatches (if hexValue exists)
- [ ] Stock badges show correct status
- [ ] "Added ✓" badge appears for selected items

### Selection & Validation
- [ ] Can add multiple colors from different variants
- [ ] Quantity input updates in real-time
- [ ] Validation errors show when quantity > available
- [ ] Alternate unit calculations are correct
- [ ] "Clear All" button works

### Transfer Creation
- [ ] Form validation prevents invalid submissions
- [ ] Bulk validation API checks stock before creation
- [ ] Transfer number generates correctly (TRF-000001)
- [ ] Stock deducted from source location
- [ ] Success message displays
- [ ] Form resets after successful creation

### Edge Cases
- [ ] Search with no results shows appropriate message
- [ ] Cannot select same from/to location
- [ ] Cannot submit with 0 items
- [ ] Cannot submit with quantities exceeding stock
- [ ] Disabled state works during async operations

## 📁 Key Files to Review

### Backend
- `src/app/api/products/search/route.ts` - Search endpoint
- `src/app/api/products/bulk-validate/route.ts` - Validation endpoint
- `src/app/api/stock-send-v2/route.ts` - Transfer creation endpoint

### Frontend
- `src/components/stock/HierarchicalProductSelector.tsx` - Main component
- `src/app/admin/send-stock-v2/page.tsx` - Demo page

### Database
- `prisma/schema.prisma` - Schema with new models
- `scripts/migrate-to-variants.ts` - Data migration script

### Documentation
- `HIERARCHICAL_IMPLEMENTATION.md` - Complete implementation guide

## 🐛 Troubleshooting

### "No results found" after search
**Cause**: Migration not run yet
**Solution**: Run `npx tsx scripts/migrate-to-variants.ts`

### "Failed to fetch" errors
**Cause**: API routes not responding
**Solution**: 
1. Check if dev server is running
2. Check console for errors
3. Verify database connection

### TypeScript errors
**Cause**: Missing Prisma types
**Solution**: Run `npx prisma generate`

### Component import errors
**Cause**: Missing UI components or dependencies
**Solution**:
```bash
npm install @tanstack/react-query class-variance-authority @radix-ui/react-select @radix-ui/react-slot lucide-react
```

## 📊 Database Queries for Verification

```sql
-- Check migration status
SELECT 
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE "hasVariants" = true) as migrated_products
FROM "Product";

-- Check variant system
SELECT 
  COUNT(DISTINCT pv.id) as variants,
  COUNT(DISTINCT pc.id) as product_colors,
  COUNT(DISTINCT sv.id) as stock_variants
FROM "ProductVariant" pv
LEFT JOIN "ProductColor" pc ON pv.id = pc."variantId"
LEFT JOIN "StockVariant" sv ON pc.id = sv."productColorId";

-- Sample hierarchical data
SELECT 
  c.name as category,
  p.name as product,
  pv.code as variant_code,
  pv.design as design,
  cm.code as color_code,
  cm.name as color_name,
  pc.sku,
  sv.quantity as stock,
  l.name as location
FROM "ProductColor" pc
JOIN "ProductVariant" pv ON pc."variantId" = pv.id
JOIN "Product" p ON pv."productId" = p.id
JOIN "Category" c ON p."categoryId" = c.id
JOIN "ColorMaster" cm ON pc."colorId" = cm.id
LEFT JOIN "StockVariant" sv ON pc.id = sv."productColorId"
LEFT JOIN "Location" l ON sv."locationId" = l.id
LIMIT 20;
```

## 🎯 Success Indicators

You'll know everything works when:
1. ✅ Migration script completes with "Migration completed successfully!"
2. ✅ Search returns grouped results with colors
3. ✅ Stock badges show correct availability
4. ✅ Selected items display with quantity inputs
5. ✅ Transfer creates successfully with unique transfer number
6. ✅ Database shows deducted stock quantities

## 📝 What's Next?

After confirming the demo page works:

1. **Update Existing Pages**
   - Replace product dropdown in `/admin/send-stock` with HierarchicalProductSelector
   - Update `/admin/new-request` for shop stock requests
   - Update stock-in page if it exists

2. **Mobile Integration**
   - Use same API endpoints in mobile app
   - Create mobile-optimized UI (bottom sheet for selections)

3. **Add Navigation Link**
   - Add menu item to navigate to `/admin/send-stock-v2`

4. **User Training**
   - Show staff how to search by category, product, shade, color
   - Demonstrate real-time stock validation

## 🆘 Need Help?

If you encounter any issues:
1. Check the console for error messages
2. Review `HIERARCHICAL_IMPLEMENTATION.md` for detailed documentation
3. Verify all dependencies are installed
4. Confirm migration completed successfully

---

**Status**: Ready for testing! 🚀

Run the migration and navigate to `/admin/send-stock-v2` to see it in action.
