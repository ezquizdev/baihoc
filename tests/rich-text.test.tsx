import { renderToStaticMarkup } from "react-dom/server";
import { RichText } from "@/components/ui/rich-text";

test("RichText renders markdown + katex math", () => {
  const html = renderToStaticMarkup(
    <RichText content={"**in đậm** và $x^2 + 1$"} />,
  );
  expect(html).toContain("<strong>");
  expect(html).toContain("katex");
});
