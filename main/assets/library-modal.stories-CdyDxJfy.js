import{n as x}from"./iframe-BmmrWt6z.js";import{L as f}from"./library-modal-DPT7iWXW.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BbnXA0RY.js";import"./Select-ef7c0426.esm-BIfiEPeH.js";import"./check-89hnE8B_.js";import"./search-DAzaa72o.js";import"./external-link-C1iGA6IL.js";var i,l,d,m,p,v,u,h,y,_,w,g,b;const{expect:r,fn:C,userEvent:B,within:c}=__STORYBOOK_MODULE_TEST__,O={title:"Office/LibraryModal",component:f,args:{onClose:C()},decorators:[e=>x.jsx("div",{className:"relative h-[600px] w-full overflow-hidden rounded-lg border border-border",children:x.jsx(e,{})})]},s={play:async({canvasElement:e})=>{const o=await c(e).findByRole("dialog",{name:"Library"});await r(c(o).getByRole("heading",{name:"Library"})).toBeInTheDocument()}},n={play:async({canvasElement:e})=>{const a=c(e),o=a.getByRole("searchbox",{name:"Search books"});await B.type(o,"zzzzznotabook"),await r(a.getByText("No books match your search.")).toBeInTheDocument(),await B.clear(o),await r(a.queryByText("No books match your search.")).not.toBeInTheDocument()}},t={play:async({args:e,canvasElement:a})=>{const o=c(a);await B.click(o.getByRole("button",{name:"Close"})),await r(e.onClose).toHaveBeenCalledOnce()}};s.parameters={...s.parameters,docs:{...(i=s.parameters)===null||i===void 0?void 0:i.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Library'
    });
    await expect(within(dialog).getByRole('heading', {
      name: 'Library'
    })).toBeInTheDocument();
  }
}`,...(d=s.parameters)===null||d===void 0||(l=d.docs)===null||l===void 0?void 0:l.source}}};n.parameters={...n.parameters,docs:{...(m=n.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const search = canvas.getByRole('searchbox', {
      name: 'Search books'
    });
    await userEvent.type(search, 'zzzzznotabook');
    await expect(canvas.getByText('No books match your search.')).toBeInTheDocument();
    await userEvent.clear(search);
    await expect(canvas.queryByText('No books match your search.')).not.toBeInTheDocument();
  }
}`,...(v=n.parameters)===null||v===void 0||(p=v.docs)===null||p===void 0?void 0:p.source},description:{story:"Searching narrows the shelf; a non-matching query shows the empty state.",...(h=n.parameters)===null||h===void 0||(u=h.docs)===null||u===void 0?void 0:u.description}}};t.parameters={...t.parameters,docs:{...(y=t.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
  play: async ({
    args,
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: 'Close'
    }));
    await expect(args.onClose).toHaveBeenCalledOnce();
  }
}`,...(w=t.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.source},description:{story:"The close button invokes onClose.",...(b=t.parameters)===null||b===void 0||(g=b.docs)===null||g===void 0?void 0:g.description}}};const F=["Default","SearchFilters","Closes"];export{t as Closes,s as Default,n as SearchFilters,F as __namedExportsOrder,O as default};
