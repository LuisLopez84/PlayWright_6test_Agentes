/**
 * Ejecuta `fn` sobre `items` con un límite de concurrencia (pool de workers).
 *
 * Por qué: varias fases de generación (una por suite, o una por archivo de
 * BoxAPIsExecute/) son independientes entre sí — no comparten estado mutable
 * ni dependen del orden de ejecución de las demás — pero antes se procesaban
 * en un `for...of` estrictamente secuencial. Cada iteración puede incluir
 * llamadas a OpenAI (cientos de ms a varios segundos de latencia de red), así
 * que paralelizarlas con un límite acotado acelera la generación real sin
 * arriesgar rate-limits de la API (a diferencia de un `Promise.all` sin límite).
 *
 * Los resultados se devuelven en el mismo orden que `items`, aunque la
 * ejecución interna sea concurrente.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await fn(items[current], current);
    }
  }

  const poolSize = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: poolSize }, () => worker()));

  return results;
}
