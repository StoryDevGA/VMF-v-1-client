import article0 from '../../../docs/help/customer/intelligence-hub.md?raw'
import article1 from '../../../docs/help/customer/intelligence-hub-context.md?raw'
import article2 from '../../../docs/help/customer/intelligence-hub-sources.md?raw'
import article3 from '../../../docs/help/customer/intelligence-hub-review.md?raw'
import article4 from '../../../docs/help/customer/intelligence-quality.md?raw'
import article5 from '../../../docs/help/customer/intelligence-hub-evidence-readiness.md?raw'
import article6 from '../../../docs/help/customer/intelligence-hub-readiness-publish.md?raw'
import article7 from '../../../docs/help/customer/intelligence-hub-after-lock.md?raw'
import article8 from '../../../docs/help/customer/intelligence-hub-coverage.md?raw'
import article9 from '../../../docs/help/customer/intelligence-hub-graph.md?raw'
import { HUB_HELP_ARTICLES } from './helpNavigation.js'

const sources = [article0, article1, article2, article3, article4, article5, article6, article7, article8, article9]
export const HELP_ARTICLES = HUB_HELP_ARTICLES.map((article, index) => ({ ...article, source: sources[index] }))
