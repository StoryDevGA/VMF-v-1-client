export default function FrameworkPackageSectionHeader({ id, title, copy }) {
  return (
    <div className="super-admin-framework-package-editor__section-header">
      <h2 id={id} className="super-admin-framework-package-editor__section-title">{title}</h2>
      <p className="super-admin-framework-package-editor__section-copy">{copy}</p>
    </div>
  )
}
