import { SITE } from '../config';

const navigation = [
  { name: 'Refining', href: '/refining' },
  { name: 'Cooking', href: '/cooking' },
  { name: 'Crafting', href: '/crafting-guide' },
  { name: 'Calculator', href: '/calculator/1' },
  { name: 'Products', href: '/products/1' },
  { name: 'Technology', href: '/technology/1' },
  { name: 'Upgrades', href: '/upgrades/1' },
  { name: 'Exocraft', href: '/exocraft/1' },
  { name: 'Starships', href: '/starships/1' },
  { name: 'Buildings', href: '/buildings/1' },
  { name: 'Fish', href: '/fish/1' },
  { name: 'Curiosities', href: '/curiosities/1' },
  { name: 'Food', href: '/food/1' },
  { name: 'Raw Materials', href: '/raw/1' },
  { name: 'All Items', href: '/items' },
  { name: 'Feedback', href: '/feedback' },
];

export default function Footer() {
  return (
    <footer className="bg-black flex flex-1 flex-col lg:pl-80">
      <div className="p-6 py-12 max-w-4xl mx-auto">
        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4 sm:gap-x-12" aria-label="Footer">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="text-sm leading-6 text-white hover:text-blue-500 transition-colors"
            >
              {item.name}
            </a>
          ))}
        </nav>
        <p className="mt-8 text-center text-xs leading-5 text-gray-500">
          No Man's Sky Recipes | Updated to&nbsp;
          <a
            className="hover:text-blue-500 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
            href={SITE.version_link}
          >
            {SITE.version_name} ({SITE.version})
          </a>
          &nbsp;on {SITE.version_date}
        </p>
        <div className="disclaimer">
          <p>This is a fan-made website. No Man's Sky™ and all related assets are trademarks
          of Hello Games. This site is not affiliated with or endorsed by Hello Games.</p>
          <p className="mt-2">
            <a href="/privacy" className="text-blue-500 hover:text-blue-400">Privacy Policy</a>
          </p>
        </div>
      </div>
    </footer>
  );
}