<script lang="ts">
	import { env } from '@countday/shared';
	import '../app.css';
	import { QueryClientProvider } from '@tanstack/svelte-query';

	let { data, children } = $props();

	$inspect(env);
</script>

<QueryClientProvider client={data.queryClient}>
	{@render children()}
</QueryClientProvider>
