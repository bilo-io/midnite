import{a$ as n,aw as R}from"./iframe-DpLYv7In.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-C3HXTQiG.js";import{P as H}from"./project-modal-Dxyd-bQe.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DeFsB2Vz.js";import"./Select-ef7c0426.esm-CuJlYyHW.js";import"./chevron-down-D-EDesfJ.js";import"./check-3H_gVqTQ.js";import"./export-menu-D2ySSIhz.js";import"./client-DGG2hc9K.js";import"./markdown-preview-yDx1LLSK.js";import"./index.dom-D_wTd2ti.js";import"./file-text-DbzG9pUF.js";import"./copy-Cp2nSP9o.js";import"./file-code-corner-CvfKAK2z.js";import"./loader-circle-QVoCfomj.js";import"./api-Df-GKKZj.js";import"./folder-open-CVWz3f4p.js";import"./folder-DbKX2tG1.js";import"./tag-color-picker-BV56KZNp.js";import"./project-tag-vuQ21KPQ.js";import"./sparkles-CNjznyhd.js";import"./brain-AumLSRyT.js";import"./chevron-right-LMo3qbFk.js";import"./markdown-editor-DBBwqLJ0.js";import"./pencil-BhKURG_m.js";import"./trash-2-B0a9sIrd.js";import"./templates-CP5VT9uT.js";import"./project-template-labels-BNpOgYd3.js";import"./plus-D3u36rTN.js";import"./task-row-Peu1E32Q.js";import"./blocked-badge-B3jNCJzO.js";import"./selectable-icon-Ba_t4HCN.js";import"./hover-expand-button-CG8lNBjs.js";import"./index-pRESN9Zq.js";import"./data-refresh-Cab60OKx.js";import"./rotate-ccw-X7fQifmD.js";import"./play-PPJlR5fh.js";import"./square-terminal-D8e2EbMq.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-B5zNSNl7.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(m=o.parameters)===null||m===void 0||(l=m.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=i.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(g=r.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const planTab = within(dialog).getByRole('tab', {
      name: /plan/i
    });
    await userEvent.click(planTab);
    await expect(planTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ha=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ha as __namedExportsOrder,ja as default};
