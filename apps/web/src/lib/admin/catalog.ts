import type { AttributeDefinition, Category, CategoryNode } from '@rgi/types';
import { adminFetch } from './session';

/**
 * The form needs every category and every attribute definition at once: switching category
 * must swap the technical fields instantly, so nothing is fetched on selection.
 * 16 categories and ~76 definitions is a small payload for that.
 */
export async function formCatalog(): Promise<{
  categories: Category[];
  definitions: Record<string, AttributeDefinition[]>;
  uploadEnabled: boolean;
}> {
  const [tree, definitions, media] = await Promise.all([
    adminFetch<CategoryNode[]>('/categories'),
    adminFetch<AttributeDefinition[]>('/attribute-definitions'),
    // Asked, not assumed: the credentials live on the API, so only it can answer.
    adminFetch<{ configured: boolean }>('/media/status').catch(() => ({ configured: false })),
  ]);

  const flatten = (nodes: CategoryNode[]): Category[] =>
    nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);

  const byType: Record<string, AttributeDefinition[]> = {};
  for (const definition of definitions) {
    byType[definition.categoryType] = [...(byType[definition.categoryType] ?? []), definition];
  }
  for (const list of Object.values(byType)) list.sort((a, b) => a.order - b.order);

  // Leaf categories only: a product belongs to "Cartes graphiques", never to "Composants".
  const categories = flatten(tree).filter(
    (category) => !tree.some((root) => root.id === category.id && root.children?.length),
  );

  return { categories, definitions: byType, uploadEnabled: media.configured };
}
