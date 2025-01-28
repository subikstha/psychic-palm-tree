// export const metadata = {
//   title: "Home",

import ProductList from "@/components/shared/product/product-list";
import { getLatestProducts } from "@/lib/actions/product.actions";

// };
const HomePage = async () => {
  const latestProducts = await getLatestProducts();
  console.log("latest products", latestProducts);
  return (
    <>
      <ProductList data={latestProducts} title="Newest Arrivals" limit={4} />
    </>
  );
};

export default HomePage;
