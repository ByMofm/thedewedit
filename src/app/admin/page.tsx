import { categoryOptions } from "@/lib/admin-products";
import { ProductAdmin } from "@/components/admin/ProductAdmin";

// El admin nunca debe cachearse ni prerenderizarse.
export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <ProductAdmin categories={categoryOptions()} />;
}
