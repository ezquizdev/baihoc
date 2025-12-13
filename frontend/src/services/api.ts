export async function getHello() {
    const res = await fetch("/api/hello");
    return res.json();
}