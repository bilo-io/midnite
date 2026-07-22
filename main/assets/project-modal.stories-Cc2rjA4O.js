import{aX as n,ax as R}from"./iframe-B6JycjIP.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-Ds2wUhST.js";import{P as H}from"./project-modal-CqjTeMK6.js";import"./preload-helper-Dp1pzeXC.js";import"./index--bblQbMJ.js";import"./Select-ef7c0426.esm-Cv1GNIBD.js";import"./chevron-down-BE683142.js";import"./check-BogCZ8oE.js";import"./index-C42ps96z.js";import"./triangle-alert-EvlYdDBe.js";import"./export-menu-GXXjfN9O.js";import"./client-BjCgbRuu.js";import"./markdown-preview-Dfn0Vjef.js";import"./index.dom-D_wTd2ti.js";import"./file-text-Ces9nTW_.js";import"./copy-x-VQ2hLE.js";import"./file-code-corner-jChUjc5K.js";import"./loader-circle-D9qsKS18.js";import"./api-Mo0ti7FN.js";import"./folder-open-DxRWeZHW.js";import"./folder-Bi2brAuj.js";import"./tag-color-picker-h9loLEU0.js";import"./project-tag-CoE7d5Vj.js";import"./sparkles-Cw4QB1j6.js";import"./brain-D5pOjzPh.js";import"./chevron-right-CFKFQPjb.js";import"./markdown-editor-B2i-nGx-.js";import"./pencil-DrRwdSzk.js";import"./trash-2-C4IgDxP3.js";import"./templates-B6M1OYb3.js";import"./plus-C3C0p77M.js";import"./task-row-C8Io_5yr.js";import"./blocked-badge-DWmBpRJO.js";import"./selectable-icon-DJrOEJOE.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-CC8gOmAn.js";import"./arrow-left-DH2sLriL.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ya={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(l=d.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(m=i.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
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
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const Ta=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,Ta as __namedExportsOrder,ya as default};
