import { publicProduct } from "@/lib/publicProject";
import { productHref } from "@/lib/projectModel";
import UpdateTimeline from "@/components/UpdateTimeline";
export const dynamic = "force-dynamic";
export default async function UpdatesPage({
  params,
}: {
  params: { projectSlug: string; productSlug: string };
}) {
  const { project, product, history } = await publicProduct(
    params.projectSlug,
    params.productSlug,
  );
  return (
    <div className="product-updates-page">
      <header>
        <span className="hero-kicker">{product.name} / 文档更新历史</span>
        <h1>产品动态</h1>
        <p>查看文档发布与修改记录，及时了解产品内容的变化。</p>
      </header>
      <UpdateTimeline
        history={history}
        base={productHref(project, product)}
        project={project}
      />
    </div>
  );
}
