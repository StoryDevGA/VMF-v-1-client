export const renderSafeInlineMarkdown = (text) => {
  const tokens = String(text || '').split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g)
  return tokens.map((token, index) => {
    const key = `inline-${index}-${token}`
    if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
      return <strong key={key}>{token.slice(2, -2)}</strong>
    }
    if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
      return <em key={key}>{token.slice(1, -1)}</em>
    }
    return token
  })
}

export const renderSafeMarkdown = (markdown, { headingOffset = 3, renderInline = renderSafeInlineMarkdown } = {}) => {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let paragraph = []
  let list = null

  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') })
    paragraph = []
  }
  const flushList = () => {
    if (!list) return
    blocks.push(list)
    list = null
  }

  lines.forEach((line) => {
    const trimmed = line.trim()
    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/)
    const unorderedItem = trimmed.match(/^[-*]\s+(.+)$/)
    const orderedItem = trimmed.match(/^\d+[.)]\s+(.+)$/)

    if (!trimmed) {
      flushParagraph()
      flushList()
    } else if (heading) {
      flushParagraph()
      flushList()
      blocks.push({ level: heading[1].length, text: heading[2], type: 'heading' })
    } else if (unorderedItem || orderedItem) {
      flushParagraph()
      const type = orderedItem ? 'ordered-list' : 'unordered-list'
      if (list?.type !== type) flushList()
      if (!list) list = { items: [], type }
      list.items.push((orderedItem || unorderedItem)[1])
    } else {
      flushList()
      paragraph.push(trimmed)
    }
  })
  flushParagraph()
  flushList()

  return blocks.map((block, index) => {
    const key = `${block.type}-${index}`
    if (block.type === 'heading') {
      const Heading = `h${Math.min(block.level + headingOffset, 6)}`
      return <Heading key={key}>{renderInline(block.text)}</Heading>
    }
    if (block.type === 'ordered-list') {
      return <ol key={key}>{block.items.map((item, itemIndex) => <li key={`${itemIndex}-${item}`}>{renderInline(item)}</li>)}</ol>
    }
    if (block.type === 'unordered-list') {
      return <ul key={key}>{block.items.map((item, itemIndex) => <li key={`${itemIndex}-${item}`}>{renderInline(item)}</li>)}</ul>
    }
    return <p key={key}>{renderInline(block.text)}</p>
  })
}

