type Event = {
  name?: string;
};

export const main = async (event: Event) => {
  console.log(`Hello ${event.name || "World"}`);
};
