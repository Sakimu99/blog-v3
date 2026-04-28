<script setup lang="ts">
const appConfig = useAppConfig();
</script>

<template>
	<footer class="blog-footer">
		<div class="footer-main reading-surface-soft">
			<nav class="footer-nav">
				<div
					v-for="(group, groupIndex) in appConfig.footer.nav"
					:key="groupIndex"
					class="footer-group"
				>
					<hgroup class="text-creative" v-text="group.title" />
					<menu>
						<li v-for="(item, itemIndex) in group.items" :key="itemIndex">
							<UtilLink :to="item.url">
								<Icon :name="item.icon" />
								<span class="nav-text">{{ item.text }}</span>
							</UtilLink>
						</li>
					</menu>
				</div>
			</nav>
			<p class="footer-copyright" v-html="appConfig.footer.copyright" />
		</div>
	</footer>
</template>

<style lang="scss" scoped>
.blog-footer {
	--gap: clamp(0.5rem, 3vh, 1rem);

	margin: 0 1rem;
	margin-top: auto;
	font-size: 0.9em;
	color: var(--c-text-2);

	.footer-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem 1.5rem;
		padding: 0.85rem 1rem var(--gap);
		flex-wrap: wrap;
		margin: 0;
	}

	.footer-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem 1.5rem;
	}

	.footer-group {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	hgroup {
		margin: 0;
		white-space: nowrap;
	}

	menu {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
	}

	a {
		display: flex;
		align-items: center;
		gap: 0.3em;
		width: fit-content;
		padding: 0.3em 0.6em;
		border-radius: 999px;
		font-size: 0.9em;
		transition:
			background-color 0.2s,
			color 0.1s;

		&:hover {
			background-color: var(--c-bg-soft);
			color: var(--c-text);
		}
	}

	.footer-copyright {
		margin: 0;
		white-space: nowrap;
	}
}
</style>
